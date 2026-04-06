// =====================================================================
// Google Apps Script — paste this into your Google Sheet's Apps Script
// (Extensions > Apps Script)
//
// SETUP:
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code, paste this entire file
// 4. Click Deploy > Manage deployments > Edit (pencil icon)
// 5. Set version to "New version", click Deploy
// =====================================================================

function processCheckin(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Use the date from the request for the tab name (YYYY-MM, monthly)
  var sheetName = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM");

  // Get or create the sheet tab for this month
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

  return rows.length;
}

// GET handler — receives data as ?data=JSON URL parameter
// This is the primary method (avoids POST body being dropped on 302 redirect)
function doGet(e) {
  try {
    if (e.parameter.data) {
      var data = JSON.parse(e.parameter.data);
      var count = processCheckin(data);
      return ContentService
        .createTextOutput(JSON.stringify({ status: "ok", rows: count }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", message: "Check-in webhook is live" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST handler — kept as fallback
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var count = processCheckin(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", rows: count }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
