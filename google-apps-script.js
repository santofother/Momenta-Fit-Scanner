// =====================================================================
// Google Apps Script — paste this into your Google Sheet's Apps Script
// (Extensions > Apps Script)
//
// SETUP:
// 1. Create a new Google Sheet (keep it PRIVATE — do NOT share "anyone with link").
// 2. Add a tab named exactly "Roster" with headers in row 1:
//        Column A = Name        Column B = Barcode
//    Fill it with your members. This is the live customer list the app reads.
// 3. Set a secret access key:
//    Project Settings (gear icon) > Script Properties > Add script property
//        Property: ACCESS_KEY      Value: <a long random passphrase>
//    This never appears in the website source — only here on Google's side.
// 4. Go to Extensions > Apps Script, delete existing code, paste this file.
// 5. Deploy > Manage deployments > Edit (pencil) > Version: "New version" > Deploy.
//    Web app access must be "Anyone" so the app can reach it — the ACCESS_KEY
//    is what actually protects the data, not the URL.
// =====================================================================

var ROSTER_SHEET = 'Roster';

function getAccessKey() {
  return PropertiesService.getScriptProperties().getProperty('ACCESS_KEY') || '';
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Fail closed: reads are refused unless ACCESS_KEY is set AND the request matches it.
function keyOk(e) {
  var required = getAccessKey();
  if (!required) return false;
  return !!(e && e.parameter && e.parameter.key === required);
}

// Read the private Roster tab -> [{name, barcode}, ...]
function readRoster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ROSTER_SHEET);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) { // row 0 = header
    var name = String(values[i][0] == null ? '' : values[i][0]).trim();
    var barcode = String(values[i][1] == null ? '' : values[i][1]).trim();
    barcode = barcode.replace(/\.0$/, ''); // strip Excel's trailing ".0"
    if (!name || !barcode) continue;
    out.push({ name: name, barcode: barcode });
  }
  return out;
}

// Tiny fingerprint of the roster so the app only re-downloads when it changes.
function rosterSignature(list) {
  var s = '';
  for (var i = 0; i < list.length; i++) s += list[i].barcode + '|' + list[i].name + '\n';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s);
  var hex = '';
  for (var j = 0; j < bytes.length; j++) {
    var b = (bytes[j] + 256) % 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return list.length + '-' + hex;
}

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

// GET handler.
//   ?action=version&key=...  -> { status:"ok", sig }              (cheap poll)
//   ?action=roster&key=...   -> { status:"ok", sig, customers }   (full list)
//   ?data=JSON               -> writes check-ins (legacy, unchanged)
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';

    if (action === 'version' || action === 'roster') {
      if (!keyOk(e)) return json({ status: 'unauthorized' });
      var list = readRoster();
      var sig = rosterSignature(list);
      if (action === 'version') return json({ status: 'ok', sig: sig });
      return json({ status: 'ok', sig: sig, customers: list });
    }

    // ── check-in write path (also key-guarded) ──
    if (e.parameter.data) {
      if (!keyOk(e)) return json({ status: 'unauthorized' });
      var data = JSON.parse(e.parameter.data);
      var count = processCheckin(data);
      return json({ status: 'ok', rows: count });
    }
    return json({ status: 'ok', message: 'Check-in webhook is live' });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}

// POST handler — kept as fallback for check-in writes
function doPost(e) {
  try {
    if (!keyOk(e)) return json({ status: 'unauthorized' });
    var data = JSON.parse(e.postData.contents);
    var count = processCheckin(data);
    return json({ status: 'ok', rows: count });
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}
