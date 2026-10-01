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
 * 5. (Optional) Customize NOTIFICATION_EMAIL below if you'd like emails sent to a specific address.
 * 6. Click "Deploy" -> "New deployment"
 * 7. Select type: "Web app"
 * 8. Set:
 *    - Description: "RD Trauma Healing Appointment Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 9. Click "Deploy" and copy the Web App URL.
 * 10. Add the URL to your project's .env file:
 *    GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/..."
 */

var NOTIFICATION_EMAIL = "wellbeingsessions@traumahealingwithrebeccadakin.co.uk";

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // 1. Append row matching the 10 required columns
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

    // 2. Send email notification with all appointment details
    try {
      var recipient = NOTIFICATION_EMAIL;
      var clientName = data.patientName || "Client";
      var apptDate = data.appointmentDate || "Date TBC";
      var apptTime = data.appointmentTime || "Time TBC";
      var sessionType = data.sessionType || "Not specified";
      var price = data.price || "Not specified";
      var email = data.email || "Not provided";
      var phone = data.phone || "Not provided";
      var message = data.message || "None provided";
      var submittedAt = data.submissionDateTime || new Date().toLocaleString();

      var subject = "New Appointment Request: " + clientName + " (" + apptDate + " at " + apptTime + ")";

      var plainTextBody =
        "You have received a new appointment request from your website:\n\n" +
        "--------------------------------------------------\n" +
        "APPOINTMENT DETAILS\n" +
        "--------------------------------------------------\n" +
        "Client Name:       " + clientName + "\n" +
        "Email:             " + email + "\n" +
        "Phone:             " + phone + "\n" +
        "Requested Date:    " + apptDate + "\n" +
        "Requested Time:    " + apptTime + "\n" +
        "Session Package:   " + sessionType + "\n" +
        "Price:             " + price + "\n" +
        "Location / Format: Online via Zoom / Leeds\n" +
        "Submitted At:      " + submittedAt + "\n\n" +
        "Client Message:\n" + message + "\n\n" +
        "--------------------------------------------------\n" +
        "This appointment row has been automatically recorded in your Google Sheet.";

      var htmlBody =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2dcd5; border-radius: 16px; background-color: #FAF6F0; color: #2C3339;">' +
        '<div style="border-bottom: 2px solid #7D6485; padding-bottom: 12px; margin-bottom: 18px;">' +
        '<h2 style="color: #7D6485; margin: 0 0 6px 0; font-size: 22px;">RD Trauma Healing</h2>' +
        '<p style="margin: 0; font-size: 14px; color: #555;">New Appointment Request Received</p>' +
        '</div>' +
        '<p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">A new appointment request has been submitted through your website booking form.</p>' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
        '<tr style="background: #f4eee6;"><td style="padding: 10px 14px; font-weight: bold; width: 35%; color: #7D6485;">Client Name</td><td style="padding: 10px 14px; font-weight: 600;">' + clientName + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Email</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;"><a href="mailto:' + email + '" style="color: #7D6485; text-decoration: underline;">' + email + '</a></td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Phone</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;"><a href="tel:' + phone + '" style="color: #7D6485; text-decoration: underline;">' + phone + '</a></td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Requested Date</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-weight: 600;">' + apptDate + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Requested Time</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-weight: 600;">' + apptTime + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Session Package</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;">' + sessionType + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Price</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-weight: 600; color: #7D6485;">' + price + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Format</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1;">Online via Zoom / In-person in Leeds</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1; vertical-align: top;">Client Message</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; white-space: pre-wrap;">' + message + '</td></tr>' +
        '<tr><td style="padding: 10px 14px; font-weight: bold; border-top: 1px solid #f0eae1;">Submitted At</td><td style="padding: 10px 14px; border-top: 1px solid #f0eae1; font-size: 12px; color: #777;">' + submittedAt + '</td></tr>' +
        '</table>' +
        '<div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2dcd5; font-size: 12px; color: #777; display: flex; justify-content: space-between;">' +
        '<span>Row saved to Google Sheet</span>' +
        '<span>RD Trauma Healing &middot; Leeds &amp; Online via Zoom</span>' +
        '</div>' +
        '</div>';

      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        body: plainTextBody,
        htmlBody: htmlBody
      });
    } catch (mailErr) {
      Logger.log("Email notification error (non-fatal): " + mailErr.toString());
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Appointment added to sheet and notification processed' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
