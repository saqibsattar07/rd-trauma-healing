import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AppointmentRecord {
  id: string;
  submissionDateTime: string;
  patientName: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: string;
  price: string;
  message: string;
  status: string;
}

/**
 * Saves an appointment record locally to disk so that appointments are never lost,
 * even if network or third-party Google APIs are unavailable.
 */
function saveLocalBackup(record: AppointmentRecord) {
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, 'appointments.json');
    let records: AppointmentRecord[] = [];
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

function normalizePrivateKey(raw?: string): string {
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

/**
 * Creates a signed JWT for Google Service Account OAuth2 authentication.
 */
function createGoogleJwt(clientEmail: string, privateKey: string): string {
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

  const encodeBase64Url = (obj: object) =>
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

/**
 * Appends appointment row to Google Sheet using a Google Cloud Service Account.
 */
async function appendViaServiceAccount(
  record: AppointmentRecord,
  clientEmail: string,
  privateKey: string,
  sheetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const jwt = createGoogleJwt(clientEmail, privateKey);

    // 1. Exchange JWT for access token
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
      return { success: false, error: `OAuth token failed: ${errText}` };
    }

    const { access_token } = (await tokenResponse.json()) as { access_token: string };

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

    // 4. Append appointment row (prefix '+' phone with apostrophe to avoid formula errors in Google Sheets)
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
  } catch (err: any) {
    console.error('[Google Sheets] Service account error:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Appends appointment row to Google Sheet using a Google Apps Script Webhook.
 */
async function appendViaWebhook(record: AppointmentRecord, webhookUrl: string): Promise<{ success: boolean; error?: string }> {
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
  } catch (err: any) {
    console.error('[Google Sheets] Webhook error:', err);
    return { success: false, error: err.message || 'Unknown webhook error' };
  }
}

/**
 * Resolves Google Cloud credentials from environment variables or local JSON key files.
 */
export function resolveGoogleCredentials(): { email?: string; privateKey?: string; sheetId?: string } {
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
  ].filter(Boolean) as string[];

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

/**
 * Main server-side handler for appointment submissions.
 */
export async function saveAppointment(payload: {
  patientName: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: string;
  price: string;
  message?: string;
}): Promise<{ success: boolean; appointmentId: string; googleSheetsSaved: boolean; googleSheetsError?: string; message: string }> {
  // Validate mandatory fields
  if (!payload.patientName?.trim()) {
    throw new Error('Patient name is required.');
  }
  if (!payload.email?.trim() || !payload.email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!payload.phone?.trim()) {
    throw new Error('Phone number is required.');
  }
  if (!payload.appointmentDate?.trim()) {
    throw new Error('Appointment date is required.');
  }
  if (!payload.appointmentTime?.trim()) {
    throw new Error('Appointment time is required.');
  }
  if (!payload.sessionType?.trim()) {
    throw new Error('Session type is required.');
  }
  if (!payload.price?.trim()) {
    throw new Error('Price selection is required.');
  }

  const id = `APPT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = new Date();
  const submissionDateTime = now.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const record: AppointmentRecord = {
    id,
    submissionDateTime,
    patientName: payload.patientName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    appointmentDate: payload.appointmentDate.trim(),
    appointmentTime: payload.appointmentTime.trim(),
    sessionType: payload.sessionType.trim(),
    price: payload.price.trim(),
    message: payload.message?.trim() || 'None provided',
    status: 'Pending',
  };

  // 1. Always save local server backup
  saveLocalBackup(record);

  // 2. Determine Google Sheets destination
  let googleSheetsSaved = false;
  let googleSheetsError: string | undefined;
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
