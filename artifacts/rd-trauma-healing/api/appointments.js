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

function normalizePrivateKey(raw) {
  let k = String(raw || '').trim();
  while ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  if (!k.includes('BEGIN') && (k.startsWith('LS0t') || k.startsWith('LS0tLS'))) {
    try {
      k = Buffer.from(k, 'base64').toString('utf8');
    } catch {}
  }
  k = k.replace(/\r\n/g, '\n');
  k = k.replace(/\\+r/g, '');
  k = k.replace(/\\+n/g, '\n');
  return k.trim();
}

function createGoogleJwt(clientEmail, privateKey) {
  const cleanEmail = String(clientEmail || '').trim().replace(/^["']|["']$/g, '');
  const normalizedKey = normalizePrivateKey(privateKey);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: cleanEmail,
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
      return { success: false, error: `Spreadsheet access error: ${metaErr}` };
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
      // Non-fatal if header check fails
    }

    // 4. Append appointment row
    // Prefix phone with apostrophe if it starts with '+' so Google Sheets doesn't parse it as a formula error (#ERROR!)
    const formattedPhone = String(record.phone || '').trim().startsWith('+')
      ? `'${String(record.phone).trim()}`
      : String(record.phone || '').trim();

    const rowValues = [
      record.submissionDateTime,
      record.patientName,
      record.email,
      formattedPhone,
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
  let email =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL;
  let privateKey =
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;
  let sheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    process.env.SPREADSHEET_ID ||
    process.env.SHEET_ID;

  const keyEnv =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT;

  const candidateStrings = [keyEnv, email, privateKey, sheetId, process.env.CREDENTIALS].filter(Boolean);

  for (const item of candidateStrings) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.client_email) email = parsed.client_email;
          if (parsed.private_key) privateKey = parsed.private_key;
          if (parsed.spreadsheet_id) sheetId = sheetId || parsed.spreadsheet_id;
        } catch {}
      }
    }
  }

  const candidateFilePaths = [
    keyEnv,
    path.resolve(process.cwd(), 'google-service-account.json'),
    path.resolve(process.cwd(), '..', 'google-service-account.json'),
    path.resolve(process.cwd(), 'credentials.json'),
    path.resolve(process.cwd(), '..', 'credentials.json'),
    path.resolve(process.cwd(), 'rd-trauma-healing-a733e07960e6.json'),
    path.resolve(process.cwd(), '..', 'rd-trauma-healing-a733e07960e6.json'),
  ].filter(Boolean);

  for (const filePath of candidateFilePaths) {
    try {
      if (typeof filePath === 'string' && fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.client_email && parsed.private_key) {
          email = email || parsed.client_email;
          privateKey = privateKey || parsed.private_key;
          sheetId = sheetId || parsed.spreadsheet_id;
          break;
        }
      }
    } catch {}
  }

  if (email) {
    email = email.trim().replace(/^["']|["']$/g, '');
  }
  if (sheetId) {
    sheetId = sheetId.trim().replace(/^["']|["']$/g, '');
    const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
  }

  return { email, privateKey, sheetId };
}

async function diagnoseGoogleSheets() {
  const { email, privateKey, sheetId } = resolveGoogleCredentials();
  const webhookUrl =
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_WEBHOOK_URL ||
    process.env.WEBHOOK_URL;

  const detectedEnvKeys = [
    'GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SPREADSHEET_ID',
    'SPREADSHEET_ID',
    'GOOGLE_SHEET_ID',
    'SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_CLIENT_EMAIL',
    'CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'PRIVATE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_CREDENTIALS',
    'SERVICE_ACCOUNT_KEY',
    'GOOGLE_SHEETS_WEBHOOK_URL',
    'GOOGLE_WEBHOOK_URL',
    'WEBHOOK_URL',
  ].filter((k) => Boolean(process.env[k]));

  const summary = {
    hasSpreadsheetId: Boolean(sheetId),
    spreadsheetIdPrefix: sheetId ? `${sheetId.substring(0, 6)}...${sheetId.slice(-4)}` : null,
    hasServiceAccountEmail: Boolean(email),
    serviceAccountEmail: email || null,
    hasPrivateKey: Boolean(privateKey),
    privateKeyLength: privateKey ? privateKey.length : 0,
    hasWebhookUrl: Boolean(webhookUrl),
    detectedEnvKeys,
    mode: webhookUrl ? 'webhook' : (email && privateKey && sheetId) ? 'service_account' : 'none',
  };

  if (summary.mode === 'none') {
    return {
      status: 'missing_credentials',
      summary,
      message: 'Google Sheets environment variables are not detected on this deployment. Please ensure you have added GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in Vercel Project Settings > Environment Variables, and that you REDEPLOYED your project after saving them.',
    };
  }

  if (summary.mode === 'service_account') {
    try {
      const jwt = createGoogleJwt(email, privateKey);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return {
          status: 'oauth_token_error',
          summary,
          error: `Google rejected OAuth JWT: ${errText}`,
        };
      }

      const { access_token } = await tokenRes.json();
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!metaRes.ok) {
        const metaErr = await metaRes.text();
        return {
          status: 'spreadsheet_access_denied',
          summary,
          error: `Google Sheets API returned error: ${metaErr}`,
          troubleshooting: `1) Ensure the Google Sheet is shared with ${email} as Editor. 2) Ensure Google Sheets API is enabled in Google Cloud Console.`,
        };
      }

      const metaData = await metaRes.json();
      return {
        status: 'connected_and_operational',
        summary,
        spreadsheetTitle: metaData.properties?.title,
        sheetTabs: metaData.sheets?.map((s) => s.properties?.title) || [],
        message: 'Google Sheets is fully connected and operational on this deployment!',
      };
    } catch (err) {
      return {
        status: 'connection_exception',
        summary,
        error: err.message || String(err),
      };
    }
  }

  if (summary.mode === 'webhook') {
    return {
      status: 'webhook_configured',
      summary,
      message: 'Using Google Apps Script Webhook for appointments.',
    };
  }
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
  const webhookUrl =
    process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
    process.env.GOOGLE_WEBHOOK_URL ||
    process.env.WEBHOOK_URL;
  const { email: saEmail, privateKey: saKey, sheetId } = resolveGoogleCredentials();

  if (webhookUrl) {
    const res = await appendViaWebhook(record, webhookUrl);
    googleSheetsSaved = res.success;
    googleSheetsError = res.error;
  } else if (saEmail && saKey && sheetId) {
    const res = await appendViaServiceAccount(record, saEmail, saKey, sheetId);
    googleSheetsSaved = res.success;
    googleSheetsError = res.error;
  } else if (!sheetId && (!saEmail || !saKey)) {
    googleSheetsError =
      'Google Sheets environment variables are not set on this deployment. Please verify Vercel environment variables and trigger a Redeploy.';
    console.warn('[Google Sheets]', googleSheetsError);
  } else if (!sheetId) {
    googleSheetsError = 'GOOGLE_SHEETS_SPREADSHEET_ID is missing from environment variables.';
    console.warn('[Google Sheets]', googleSheetsError);
  } else if (!saEmail) {
    googleSheetsError = 'GOOGLE_SERVICE_ACCOUNT_EMAIL is missing from environment variables.';
    console.warn('[Google Sheets]', googleSheetsError);
  } else if (!saKey) {
    googleSheetsError = 'GOOGLE_PRIVATE_KEY is missing from environment variables.';
    console.warn('[Google Sheets]', googleSheetsError);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const diag = await diagnoseGoogleSheets();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(diag, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
    }
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
module.exports.diagnoseGoogleSheets = diagnoseGoogleSheets;
