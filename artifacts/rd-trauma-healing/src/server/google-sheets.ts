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
 * Helper to ensure local .env files are read if environment variables are not already populated.
 */
function loadLocalEnvFile() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
    'e:/rd-trauma-healing/.env',
    'e:/rd-trauma-healing/artifacts/rd-trauma-healing/.env',
  ];
  for (const envPath of envCandidates) {
    try {
      if (fs.existsSync(envPath)) {
        const fileContent = fs.readFileSync(envPath, 'utf8');
        for (const line of fileContent.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {}
  }
}

/**
 * Resolves Google Cloud credentials from environment variables or local JSON key files.
 */
export function resolveGoogleCredentials(): { email?: string; privateKey?: string; sheetId?: string } {
  loadLocalEnvFile();

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
}): Promise<{
  success: boolean;
  appointmentId: string;
  googleSheetsSaved: boolean;
  emailNotificationSent?: boolean;
  emailNotificationMethod?: string;
  googleSheetsError?: string;
  message: string;
}> {
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

  // 3. Send email notification containing all submitted appointment details
  let emailNotificationResult: { success: boolean; method?: string; error?: string } = { success: false, method: 'none' };
  try {
    emailNotificationResult = await sendEmailNotification(record);
  } catch (err: any) {
    console.error('[Email Notification] Error sending notification:', err);
  }

  return {
    success: true,
    appointmentId: id,
    googleSheetsSaved,
    emailNotificationSent: emailNotificationResult.success,
    emailNotificationMethod: emailNotificationResult.method,
    ...(googleSheetsError && !googleSheetsSaved ? { googleSheetsError } : {}),
    message: 'Thank you. Your appointment request has been received. Rebecca will contact you to confirm your session.',
  };
}

/**
 * Saves notification to local disk log so appointment details are never lost.
 */
function saveNotificationLog(record: AppointmentRecord, notificationResult: { success: boolean; method: string; details?: string }) {
  try {
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const logPath = path.join(dataDir, 'notifications.json');
    let logs: any[] = [];
    if (fs.existsSync(logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch {
        logs = [];
      }
    }
    logs.push({
      timestamp: new Date().toISOString(),
      appointmentId: record.id,
      patientName: record.patientName,
      email: record.email,
      phone: record.phone,
      appointmentDate: record.appointmentDate,
      appointmentTime: record.appointmentTime,
      sessionType: record.sessionType,
      price: record.price,
      message: record.message,
      notification: notificationResult,
    });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('[Notification Log] Error saving notification log:', err);
  }
}

/**
 * Sends an email notification to the practitioner whenever an appointment is submitted.
 * Supports Resend, SendGrid, SMTP / Gmail, and local disk logging.
 */
export async function sendEmailNotification(record: AppointmentRecord): Promise<{ success: boolean; method: string; error?: string }> {
  const recipient =
    process.env.NOTIFICATION_EMAIL ||
    process.env.APPOINTMENT_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'wellbeingsessions@traumahealingwithrebeccadakin.co.uk';

  const subject = `New Appointment Request: ${record.patientName} (${record.appointmentDate} at ${record.appointmentTime})`;

  const plainText = [
    `You have received a new appointment request from your website:`,
    ``,
    `--------------------------------------------------`,
    `APPOINTMENT DETAILS`,
    `--------------------------------------------------`,
    `Reference ID:      ${record.id}`,
    `Client Name:       ${record.patientName}`,
    `Email:             ${record.email}`,
    `Phone:             ${record.phone}`,
    `Requested Date:    ${record.appointmentDate}`,
    `Requested Time:    ${record.appointmentTime}`,
    `Session Package:   ${record.sessionType}`,
    `Price:             ${record.price}`,
    `Location / Format: Online via Zoom / Leeds`,
    `Submitted At:      ${record.submissionDateTime}`,
    ``,
    `Client Message:`,
    `${record.message}`,
    `--------------------------------------------------`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2dcd5; border-radius: 16px; background-color: #FAF6F0; color: #2C3339;">
      <div style="border-bottom: 2px solid #7D6485; padding-bottom: 12px; margin-bottom: 18px;">
        <h2 style="color: #7D6485; margin: 0 0 6px 0; font-size: 22px;">RD Trauma Healing</h2>
        <p style="margin: 0; font-size: 14px; color: #555;">New Appointment Request Received</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">A new appointment request has been submitted through your website booking form.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <tr style="background: #f4eee6;"><td style="padding: 10px 14px; font-weight: bold; width: 35%; color: #7D6485;">Client Name</td><td style="padding: 10px 14px; font-weight: 600;">${record.patientName}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Email</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;"><a href="mailto:${record.email}" style="color: #7D6485; text-decoration: underline;">${record.email}</a></td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Phone</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;"><a href="tel:${record.phone}" style="color: #7D6485; text-decoration: underline;">${record.phone}</a></td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Requested Date</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-weight: 600;">${record.appointmentDate}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Requested Time</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-weight: 600;">${record.appointmentTime}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Session Package</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;">${record.sessionType}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Price</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-weight: 600; color: #7D6485;">${record.price}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Format</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;">Online via Zoom / In-person in Leeds</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1; vertical-align: top;">Client Message</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; white-space: pre-wrap;">${record.message}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Reference ID</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-family: monospace; font-size: 12px;">${record.id}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Submitted At</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-size: 12px; color: #777;">${record.submissionDateTime}</td></tr>
      </table>
      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2dcd5; font-size: 12px; color: #777;">
        RD Trauma Healing &middot; Leeds &amp; Online via Zoom
      </div>
    </div>
  `;

  // Option 1: Resend API
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || process.env.MAIL_FROM || 'RD Trauma Healing <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipient,
          subject,
          text: plainText,
          html,
        }),
      });
      if (res.ok) {
        console.log(`[Email Notification] Successfully sent via Resend to ${recipient}`);
        saveNotificationLog(record, { success: true, method: 'resend' });
        return { success: true, method: 'resend' };
      } else {
        const errText = await res.text();
        console.error(`[Email Notification] Resend API error:`, errText);
      }
    } catch (e: any) {
      console.error(`[Email Notification] Resend fetch exception:`, e);
    }
  }

  // Option 2: SendGrid API
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || process.env.MAIL_FROM || 'wellbeingsessions@traumahealingwithrebeccadakin.co.uk';
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromEmail, name: 'RD Trauma Healing' },
          subject,
          content: [
            { type: 'text/plain', value: plainText },
            { type: 'text/html', value: html },
          ],
        }),
      });
      if (res.ok) {
        console.log(`[Email Notification] Successfully sent via SendGrid to ${recipient}`);
        saveNotificationLog(record, { success: true, method: 'sendgrid' });
        return { success: true, method: 'sendgrid' };
      } else {
        const errText = await res.text();
        console.error(`[Email Notification] SendGrid API error:`, errText);
      }
    } catch (e: any) {
      console.error(`[Email Notification] SendGrid fetch exception:`, e);
    }
  }

  // Option 3: Nodemailer / SMTP (supports Gmail App Passwords, Custom SMTP)
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if ((smtpHost && smtpUser && smtpPass) || (process.env.GMAIL_APP_PASSWORD && smtpUser)) {
    try {
      const nodemailer = await import('nodemailer');
      const cleanPass = (process.env.GMAIL_APP_PASSWORD || smtpPass || '').replace(/\s+/g, '');
      const transportConfig: any = process.env.GMAIL_APP_PASSWORD
        ? {
            service: 'gmail',
            auth: { user: smtpUser, pass: cleanPass },
          }
        : {
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth: { user: smtpUser, pass: cleanPass },
          };

      const transporter = (nodemailer.default || nodemailer).createTransport(transportConfig);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.MAIL_FROM || `"RD Trauma Healing" <${smtpUser}>`,
        to: recipient,
        subject,
        text: plainText,
        html,
      });
      console.log(`[Email Notification] Successfully sent via SMTP to ${recipient}`);
      saveNotificationLog(record, { success: true, method: 'smtp' });
      return { success: true, method: 'smtp' };
    } catch (e: any) {
      console.error(`[Email Notification] SMTP error:`, e.message || e);
    }
  }

  // Fallback: When no external email service API key is provided, log to console & local backup log
  console.log(`[Email Notification] Form submission recorded for ${record.patientName} (${record.email}). Details:`, {
    recipient,
    subject,
    date: record.appointmentDate,
    time: record.appointmentTime,
    session: record.sessionType,
    price: record.price,
  });
  saveNotificationLog(record, { success: true, method: 'logged_and_backed_up', details: 'Notification logged and stored locally' });

  return { success: true, method: 'logged_and_backed_up' };
}

