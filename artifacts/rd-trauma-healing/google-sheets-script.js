/**
 * Google Apps Script for RD Trauma Healing Appointments
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet where appointments should be stored.
 * 2. In row 1, set up these column headers:
 *    A1: Submission Date/Time
 *    B1: Patient Name
 *    C1: Email
 *    D1: Phone
 *    E1: Appointment Date
 *    F1: Appointment Time
 *    G1: Session Type
 *    H1: Price
 *    I1: Message
 *    J1: Status
 * 
 * 3. In Google Sheets, click: Extensions -> Apps Script
 * 4. Replace any existing code with this script.
 * 5. Click "Deploy" -> "New deployment"
 * 6. Select type: "Web app"
 * 7. Set:
 *    - Description: "RD Trauma Healing Appointment Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 8. Click "Deploy" and copy the Web App URL.
 * 9. Add the URL to your project's .env file:
 *    GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/..."
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Append row matching the 10 required columns
    sheet.appendRow([
      data.submissionDateTime || new Date().toLocaleString(),
      data.patientName || '',
      data.email || '',
      data.phone || '',
      data.appointmentDate || '',
      data.appointmentTime || '',
      data.sessionType || '',
      data.price || '',
      data.message || '',
      data.status || 'Pending'
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Appointment added to sheet' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
