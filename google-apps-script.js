// =====================================================================
// Google Apps Script — paste this into your Google Sheet's Apps Script
// (Extensions > Apps Script)
//
// SETUP:
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code, paste this entire file
// 4. Click Deploy > New deployment
// 5. Select type: Web app
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Click Deploy, authorize when prompted
// 9. Copy the URL and paste it into GOOGLE_SCRIPT_URL in index.html
// =====================================================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Use the date from the request for the tab name (YYYY-MM-DD)
    var sheetName = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

    // Get or create the sheet tab for this day
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Name", "Barcode", "Time", "Date", "Synced At"]);
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
      sheet.setColumnWidth(1, 200);
      sheet.setColumnWidth(2, 150);
      sheet.setColumnWidth(3, 120);
      sheet.setColumnWidth(4, 120);
      sheet.setColumnWidth(5, 180);
    }

    // Handle batch of check-ins
    var rows = Array.isArray(data.checkins) ? data.checkins : [data];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      sheet.appendRow([
        row.name || "",
        row.barcode || "",
        row.time || "",
        row.date || "",
        new Date().toISOString()
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", rows: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test endpoint — visit the URL in a browser to verify it's working
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Check-in webhook is live" }))
    .setMimeType(ContentService.MimeType.JSON);
}
