const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function saveLocalBackup(record) {
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, 'appointments.json');
    let records = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        records = JSON.parse(content);
      } catch {
        records = [];
      }
    }
    records.push(record);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
    console.log(`[Appointments] Saved local backup for ${record.patientName} (${record.id})`);
  } catch (err) {
    console.error('[Appointments] Error saving local backup:', err);
  }
}

function createGoogleJwt(clientEmail, privateKey) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = encodeBase64Url(header);
  const encodedClaim = encodeBase64Url(claim);
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const normalizedKey = privateKey.replace(/\\n/g, '\n');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer
    .sign(normalizedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

async function appendViaServiceAccount(record, clientEmail, privateKey, sheetId) {
  try {
    const jwt = createGoogleJwt(clientEmail, privateKey);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[Google Sheets] OAuth token exchange failed:', errText);
      return { success: false, error: `OAuth token exchange failed: ${errText}` };
    }

    const { access_token } = await tokenResponse.json();

    // 2. Fetch spreadsheet to determine the first sheet's actual title
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!metaResponse.ok) {
      const metaErr = await metaResponse.text();
      console.error('[Google Sheets] Fetch metadata failed:', metaErr);
      return { success: false, error: `Spreadsheet access error (check sharing & API status): ${metaErr}` };
    }

    const metaData = await metaResponse.json();
    const sheetTitle = metaData?.sheets?.[0]?.properties?.title || 'Sheet1';
    const encodedTitle = encodeURIComponent(sheetTitle);

    // 3. Check if header row exists
    try {
      const checkHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A1:J1`;
      const headerCheckRes = await fetch(checkHeaderUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (headerCheckRes.ok) {
        const headerData = await headerCheckRes.json();
        if (!headerData.values || headerData.values.length === 0) {
          const headers = [
            'Submission Date/Time',
            'Patient Name',
            'Email',
            'Phone',
            'Appointment Date',
            'Appointment Time',
            'Session Type',
            'Price',
            'Message',
            'Status',
          ];
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A1:J1?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [headers] }),
          });
        }
      }
    } catch {
      // Continue
    }

    // 4. Append appointment row
    const rowValues = [
      record.submissionDateTime,
      record.patientName,
      record.email,
      record.phone,
      record.appointmentDate,
      record.appointmentTime,
      record.sessionType,
      record.price,
      record.message,
      record.status,
    ];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A1:append?valueInputOption=USER_ENTERED`;
    const appendResponse = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    if (!appendResponse.ok) {
      const appendErr = await appendResponse.text();
      console.error('[Google Sheets] Append row failed:', appendErr);
      return { success: false, error: `Append failed: ${appendErr}` };
    }

    console.log(`[Google Sheets] Successfully appended appointment row for ${record.patientName} into '${sheetTitle}'`);
    return { success: true };
  } catch (err) {
    console.error('[Google Sheets] Service account error:', err);
    return { success: false, error: err.message || 'Unknown service account error' };
  }
}

async function appendViaWebhook(record, webhookUrl) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionDateTime: record.submissionDateTime,
        patientName: record.patientName,
        email: record.email,
        phone: record.phone,
        appointmentDate: record.appointmentDate,
        appointmentTime: record.appointmentTime,
        sessionType: record.sessionType,
        price: record.price,
        message: record.message,
        status: record.status,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Google Sheets] Webhook response not OK:', text);
      return { success: false, error: `Webhook error: ${text}` };
    }

    console.log(`[Google Sheets Webhook] Successfully posted appointment for ${record.patientName}`);
    return { success: true };
  } catch (err) {
    console.error('[Google Sheets] Webhook error:', err);
    return { success: false, error: err.message || 'Unknown webhook error' };
  }
}

function resolveGoogleCredentials() {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  let sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const candidatePaths = [
    keyEnv,
    path.resolve(process.cwd(), 'google-service-account.json'),
    path.resolve(process.cwd(), '..', 'google-service-account.json'),
    path.resolve(process.cwd(), 'credentials.json'),
    path.resolve(process.cwd(), '..', 'credentials.json'),
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    try {
      if (candidate.trim().startsWith('{')) {
        const parsed = JSON.parse(candidate);
        if (parsed.client_email && parsed.private_key) {
          email = email || parsed.client_email;
          privateKey = privateKey || parsed.private_key;
          sheetId = sheetId || parsed.spreadsheet_id;
          break;
        }
      }
      if (fs.existsSync(candidate)) {
        const fileContent = fs.readFileSync(candidate, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.client_email && parsed.private_key) {
          email = email || parsed.client_email;
          privateKey = privateKey || parsed.private_key;
          sheetId = sheetId || parsed.spreadsheet_id;
          break;
        }
      }
    } catch {
      // Continue
    }
  }

  return { email, privateKey, sheetId };
}

async function saveAppointment(payload) {
  if (!payload || !payload.patientName || !payload.patientName.trim()) {
    throw new Error('Patient name is required.');
  }
  if (!payload.email || !payload.email.trim() || !payload.email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!payload.phone || !payload.phone.trim()) {
    throw new Error('Phone number is required.');
  }
  if (!payload.appointmentDate || !payload.appointmentDate.trim()) {
    throw new Error('Appointment date is required.');
  }
  if (!payload.appointmentTime || !payload.appointmentTime.trim()) {
    throw new Error('Appointment time is required.');
  }
  if (!payload.sessionType || !payload.sessionType.trim()) {
    throw new Error('Session type is required.');
  }
  if (!payload.price || !payload.price.trim()) {
    throw new Error('Price selection is required.');
  }

  const id = `APPT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date();
  const submissionDateTime = now.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const record = {
    id,
    submissionDateTime,
    patientName: payload.patientName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    appointmentDate: payload.appointmentDate.trim(),
    appointmentTime: payload.appointmentTime.trim(),
    sessionType: payload.sessionType.trim(),
    price: payload.price.trim(),
    message: payload.message ? payload.message.trim() : 'None provided',
    status: 'Pending',
  };

  saveLocalBackup(record);

  let googleSheetsSaved = false;
  let googleSheetsError = null;
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const { email: saEmail, privateKey: saKey, sheetId } = resolveGoogleCredentials();

  if (webhookUrl) {
    const res = await appendViaWebhook(record, webhookUrl);
    googleSheetsSaved = res.success;
    googleSheetsError = res.error;
  } else if (saEmail && saKey && sheetId) {
    const res = await appendViaServiceAccount(record, saEmail, saKey, sheetId);
    googleSheetsSaved = res.success;
    googleSheetsError = res.error;
  } else if (saEmail && saKey && !sheetId) {
    googleSheetsError = 'GOOGLE_SHEETS_SPREADSHEET_ID is missing from environment variables.';
    console.warn('[Google Sheets]', googleSheetsError);
  } else {
    googleSheetsError = 'Google Sheets credentials not configured in environment variables.';
    console.log('[Google Sheets]', googleSheetsError);
  }

  return {
    success: true,
    appointmentId: id,
    googleSheetsSaved,
    ...(googleSheetsError && !googleSheetsSaved ? { googleSheetsError } : {}),
    message: 'Thank you. Your appointment request has been received. Rebecca will contact you to confirm your session.',
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }
    const result = await saveAppointment(payload);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Failed to process appointment request' }));
  }
};
module.exports.saveAppointment = saveAppointment;
