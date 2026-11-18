/**
 * b'zliQué Beauty Bar — booking backend (Google Apps Script)
 *
 * What this does:
 *  1. setup()  -> builds your "Bookings" and "Clients" tabs (run once).
 *  2. doPost() -> receives bookings from the website form, adds a row to
 *                 "Bookings", creates/updates the client in "Clients",
 *                 blocks double-booked time slots, and sends emails.
 *
 * HOW TO INSTALL: see the steps in the chat message / SETUP-GUIDE.md.
 */

// ============ EDIT THESE ============
const CONFIG = {
  BUSINESS_NAME: "b'zliQué Beauty Bar",
  OWNER_EMAIL: "YOUR_EMAIL@gmail.com",        // new-booking alerts go here
  DEPOSIT_AMOUNT: 10,                          // CAD (must match script.js)
  ETRANSFER_EMAIL: "YOUR_ETRANSFER_EMAIL",     // where clients send the deposit
  ETRANSFER_NOTE: "Please include your full name and appointment date in the e-transfer message.",
  DEPOSIT_DEADLINE_HOURS: 24,                  // shown in the client email
  SEND_CLIENT_EMAIL: true,
  SEND_OWNER_EMAIL: true
};

const BOOKINGS_TAB = "Bookings";
const CLIENTS_TAB = "Clients";

const BOOKING_HEADERS = [
  "Booking ID", "Submitted", "Status", "Deposit Paid?", "Client Name", "Email",
  "Phone", "Service", "Category", "Appt Date", "Appt Time", "Deposit Amount",
  "Client Notes", "My Notes", "Reminder Sent"
];
const CLIENT_HEADERS = [
  "Client Name", "Email", "Phone", "First Booking", "Last Booking",
  "Total Bookings", "Last Service", "My Notes (allergies, preferences, etc.)"
];

// Names must match the "name" fields in script.js exactly.
// minutes = appointment length, used to stop overlapping bookings.
// addOn = true means it can be added to another appointment, so it
//         never blocks (or gets blocked by) another booking.
const SERVICE_INFO = {
  "Brow Lamination + Sculpt + Tint":    { category: "Brow", minutes: 90 },
  "Brow Lamination + Sculpt (No Tint)": { category: "Brow", minutes: 90 },
  "Brow Lamination Maintenance":        { category: "Brow", minutes: 90 },
  "Henna Brows + Brow Sculpt":          { category: "Brow", minutes: 90 },
  "Brow Sculpt + Tint":                 { category: "Brow", minutes: 90 },
  "Brow Sculpt":                        { category: "Brow", minutes: 60 },
  "Brow Extensions (Add-On)":           { category: "Brow", minutes: 30, addOn: true },
  "Natural Clusters":                   { category: "Lash", minutes: 45 },
  "Hybrid Wispy Clusters":              { category: "Lash", minutes: 45 }
};

// ============ ONE-TIME SETUP ============
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Bookings tab ---
  let bookings = ss.getSheetByName(BOOKINGS_TAB) || ss.getSheets()[0].setName(BOOKINGS_TAB);
  bookings.clear();
  bookings.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
  styleHeader_(bookings, BOOKING_HEADERS.length);
  bookings.setFrozenRows(1);
  bookings.setFrozenColumns(1);

  // Status dropdown (column C) and Deposit Paid dropdown (column D)
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending Deposit", "Confirmed", "Completed", "Cancelled", "No-Show"], true)
    .setAllowInvalid(false).build();
  bookings.getRange("C2:C1000").setDataValidation(statusRule);
  const paidRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["No", "Yes"], true).setAllowInvalid(false).build();
  bookings.getRange("D2:D1000").setDataValidation(paidRule);

  // Colour-code Status
  const statusRange = bookings.getRange("C2:C1000");
  bookings.setConditionalFormatRules([
    colorRule_(statusRange, "Pending Deposit", "#fff2cc"),
    colorRule_(statusRange, "Confirmed", "#d9ead3"),
    colorRule_(statusRange, "Completed", "#cfe2f3"),
    colorRule_(statusRange, "Cancelled", "#f4cccc"),
    colorRule_(statusRange, "No-Show", "#e6b8af")
  ]);
  bookings.getRange("L2:L1000").setNumberFormat("$#,##0.00");
  bookings.getRange("J2:J1000").setNumberFormat("ddd, mmm d, yyyy");
  bookings.getRange("K2:K1000").setNumberFormat("@"); // time stays as text, e.g. 14:30
  bookings.getRange("B2:B1000").setNumberFormat("yyyy-mm-dd hh:mm");
  bookings.autoResizeColumns(1, BOOKING_HEADERS.length);

  // --- Clients tab ---
  let clients = ss.getSheetByName(CLIENTS_TAB) || ss.insertSheet(CLIENTS_TAB);
  clients.clear();
  clients.getRange(1, 1, 1, CLIENT_HEADERS.length).setValues([CLIENT_HEADERS]);
  styleHeader_(clients, CLIENT_HEADERS.length);
  clients.setFrozenRows(1);
  clients.getRange("D2:E1000").setNumberFormat("yyyy-mm-dd");
  clients.autoResizeColumns(1, CLIENT_HEADERS.length);

  ss.rename(CONFIG.BUSINESS_NAME + " — Bookings");
  SpreadsheetApp.getUi().alert("Setup complete! Your Bookings and Clients tabs are ready.");
}

function styleHeader_(sheet, cols) {
  sheet.getRange(1, 1, 1, cols)
    .setBackground("#0a0a09").setFontColor("#c6a15b")
    .setFontWeight("bold").setHorizontalAlignment("left");
}
function colorRule_(range, text, color) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text).setBackground(color).setRanges([range]).build();
}

// ============ RECEIVE BOOKINGS FROM THE WEBSITE ============
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    const data = JSON.parse(e.postData.contents);

    // Spam trap: real visitors never fill this hidden field
    if (data.website) return json_({ ok: true });

    // ---- Validate ----
    const name = clean_(data.name, 80);
    const email = clean_(data.email, 120).toLowerCase();
    const phone = clean_(data.phone, 30);
    const service = clean_(data.service, 80);
    const date = clean_(data.date, 10);   // yyyy-mm-dd
    const time = clean_(data.time, 5);    // hh:mm
    const notes = clean_(data.notes, 500);

    if (!name || !email || !phone || !service || !date || !time) {
      return json_({ ok: false, error: "Please fill in all required fields." });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json_({ ok: false, error: "Please enter a valid email address." });
    }
    if (!SERVICE_INFO[service]) {
      return json_({ ok: false, error: "Unknown service selected." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return json_({ ok: false, error: "Invalid date or time." });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BOOKINGS_TAB);

    // ---- Block overlapping appointments (uses each service's length) ----
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues()
      : [];
    const tz = ss.getSpreadsheetTimeZone();
    const newInfo = SERVICE_INFO[service];
    if (!newInfo.addOn) {
      const newStart = toMinutes_(time);
      const newEnd = newStart + newInfo.minutes;
      for (const r of rows) {
        const rStatus = r[2];
        if (rStatus === "Cancelled" || rStatus === "No-Show") continue;
        const rDate = r[9] instanceof Date ? Utilities.formatDate(r[9], tz, "yyyy-MM-dd") : String(r[9]);
        if (rDate !== date) continue;
        const rInfo = SERVICE_INFO[r[7]] || { minutes: 60 };
        if (rInfo.addOn) continue;
        const rTime = r[10] instanceof Date ? Utilities.formatDate(r[10], tz, "HH:mm") : String(r[10]);
        const rStart = toMinutes_(rTime);
        if (newStart < rStart + rInfo.minutes && rStart < newEnd) {
          return json_({ ok: false, error: "That time overlaps another appointment. Please choose a different time." });
        }
      }
    }

    // ---- Write the booking ----
    const bookingId = "BZ-" + Utilities.formatDate(new Date(), tz, "yyMMdd") + "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const apptDate = new Date(date + "T00:00:00");

    sheet.appendRow([
      bookingId, new Date(), "Pending Deposit", "No", name, email, phone,
      service, newInfo.category, apptDate, "",
      CONFIG.DEPOSIT_AMOUNT, notes, ""
    ]);
    // Store the time as plain text so Sheets doesn't convert it to a time value
    const newRow = sheet.getLastRow();
    sheet.getRange(newRow, 11).setNumberFormat("@").setValue(time);
    // Re-apply dropdowns to the new row (appendRow doesn't always inherit them)
    sheet.getRange(newRow, 3).setDataValidation(sheet.getRange("C2").getDataValidation());
    sheet.getRange(newRow, 4).setDataValidation(sheet.getRange("D2").getDataValidation());

    // ---- Update the client tracking list ----
    upsertClient_(ss, { name, email, phone, service, apptDate });

    // ---- Emails ----
    if (CONFIG.SEND_CLIENT_EMAIL) sendClientEmail_({ bookingId, name, email, service, date, time });
    if (CONFIG.SEND_OWNER_EMAIL) sendOwnerEmail_({ bookingId, name, email, phone, service, date, time, notes });

    return json_({ ok: true, bookingId: bookingId });

  } catch (err) {
    return json_({ ok: false, error: "Something went wrong. Please try again or message us on Instagram." });
  } finally {
    lock.releaseLock();
  }
}

// Lets you visit the web-app URL in a browser to confirm it's live
function doGet() {
  return ContentService.createTextOutput("b'zliQué booking endpoint is live.");
}

// ============ CLIENT TRACKING ============
function upsertClient_(ss, c) {
  const sheet = ss.getSheetByName(CLIENTS_TAB);
  const last = sheet.getLastRow();
  if (last > 1) {
    const emails = sheet.getRange(2, 2, last - 1, 1).getValues().flat();
    const idx = emails.indexOf(c.email);
    if (idx !== -1) {
      const row = idx + 2;
      const total = Number(sheet.getRange(row, 6).getValue()) || 0;
      sheet.getRange(row, 3).setValue(c.phone);           // keep phone current
      sheet.getRange(row, 5).setValue(c.apptDate);         // last booking
      sheet.getRange(row, 6).setValue(total + 1);          // total bookings
      sheet.getRange(row, 7).setValue(c.service);          // last service
      return;
    }
  }
  sheet.appendRow([c.name, c.email, c.phone, c.apptDate, c.apptDate, 1, c.service, ""]);
}

// ============ EMAILS ============
function sendClientEmail_(b) {
  const subject = "Your " + CONFIG.BUSINESS_NAME + " booking request (" + b.bookingId + ")";
  const body =
    "Hi " + b.name + ",\n\n" +
    "Thank you for booking with " + CONFIG.BUSINESS_NAME + "! Here are your details:\n\n" +
    "Service: " + b.service + "\n" +
    "Date: " + b.date + "\n" +
    "Time: " + b.time + "\n" +
    "Booking ID: " + b.bookingId + "\n\n" +
    "TO CONFIRM YOUR SPOT\n" +
    "Please send your $" + CONFIG.DEPOSIT_AMOUNT + " deposit by Interac e-Transfer to " +
    CONFIG.ETRANSFER_EMAIL + " within " + CONFIG.DEPOSIT_DEADLINE_HOURS + " hours.\n" +
    CONFIG.ETRANSFER_NOTE + "\n\n" +
    "Your appointment is confirmed once the deposit is received. The deposit is applied to your final total.\n\n" +
    "See you soon,\n" + CONFIG.BUSINESS_NAME;
  MailApp.sendEmail({ to: b.email, subject: subject, body: body, name: CONFIG.BUSINESS_NAME });
}

function sendOwnerEmail_(b) {
  const subject = "New booking: " + b.name + " — " + b.service + " (" + b.date + " " + b.time + ")";
  const body =
    "New booking request\n\n" +
    "ID: " + b.bookingId + "\nClient: " + b.name + "\nEmail: " + b.email + "\nPhone: " + b.phone + "\n" +
    "Service: " + b.service + "\nWhen: " + b.date + " at " + b.time + "\n" +
    "Notes: " + (b.notes || "—") + "\n\n" +
    "Status is 'Pending Deposit'. Mark 'Deposit Paid?' = Yes and Status = Confirmed once the e-transfer arrives.\n\n" +
    SpreadsheetApp.getActiveSpreadsheet().getUrl();
  MailApp.sendEmail({ to: CONFIG.OWNER_EMAIL, subject: subject, body: body });
}

// ============ MANAGE BOOKINGS FROM THE SHEET ============
// Adds a "b'zliQué" menu at the top of the sheet.
function onOpen() {
  SpreadsheetApp.getUi().createMenu("b'zliQué")
    .addItem("Confirm selected booking (deposit received)", "confirmSelectedBooking")
    .addItem("Cancel selected booking", "cancelSelectedBooking")
    .addSeparator()
    .addItem("Turn on daily reminders (24h before)", "installReminderTrigger")
    .addItem("Send a test booking to myself", "testBooking")
    .addToUi();
}

// Click any cell in a booking row, then run this. It marks the deposit paid,
// sets the status to Confirmed, and emails the client their confirmation.
function confirmSelectedBooking() {
  const ui = SpreadsheetApp.getUi();
  const row = selectedBookingRow_();
  if (!row) return;
  const sheet = row.sheet, n = row.number, v = row.values;

  if (v[2] === "Confirmed") { ui.alert("This booking is already confirmed."); return; }
  if (v[2] === "Cancelled") { ui.alert("This booking is cancelled. Change the status manually if you want to revive it."); return; }

  sheet.getRange(n, 3).setValue("Confirmed");
  sheet.getRange(n, 4).setValue("Yes");
  if (CONFIG.SEND_CLIENT_EMAIL) {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    MailApp.sendEmail({
      to: v[5],
      subject: "You're confirmed — " + CONFIG.BUSINESS_NAME,
      name: CONFIG.BUSINESS_NAME,
      body:
        "Hi " + v[4] + ",\n\n" +
        "Your deposit has been received and your appointment is confirmed!\n\n" +
        "Service: " + v[7] + "\n" +
        "Date: " + niceDate_(v[9], tz) + "\n" +
        "Time: " + niceTime_(v[10], tz) + "\n\n" +
        "Please give at least 24 hours' notice if you need to cancel or reschedule. " +
        "Late cancellations and no-shows forfeit the deposit.\n\n" +
        "See you soon,\n" + CONFIG.BUSINESS_NAME
    });
  }
  ui.alert("Confirmed. " + v[4] + " was emailed their confirmation.");
}

// Marks the selected booking Cancelled (freeing the time slot) and emails the client.
function cancelSelectedBooking() {
  const ui = SpreadsheetApp.getUi();
  const row = selectedBookingRow_();
  if (!row) return;
  const v = row.values;

  const answer = ui.alert("Cancel booking",
    "Cancel " + v[4] + "'s " + v[7] + " booking and email them?", ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;

  row.sheet.getRange(row.number, 3).setValue("Cancelled");
  if (CONFIG.SEND_CLIENT_EMAIL) {
    MailApp.sendEmail({
      to: v[5],
      subject: "Your appointment has been cancelled — " + CONFIG.BUSINESS_NAME,
      name: CONFIG.BUSINESS_NAME,
      body:
        "Hi " + v[4] + ",\n\n" +
        "Your " + v[7] + " appointment (" + v[0] + ") has been cancelled. " +
        "If you'd like to rebook, you can choose a new time on our website.\n\n" +
        CONFIG.BUSINESS_NAME
    });
  }
  ui.alert("Cancelled. The time slot is open again.");
}

// Emails every Confirmed client whose appointment is tomorrow. Runs daily once
// you turn reminders on from the menu.
function sendReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return;
  const tz = ss.getSpreadsheetTimeZone();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, tz, "yyyy-MM-dd");

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues();
  rows.forEach(function (v, i) {
    if (v[2] !== "Confirmed" || v[14]) return;
    const d = v[9] instanceof Date ? Utilities.formatDate(v[9], tz, "yyyy-MM-dd") : String(v[9]);
    if (d !== tomorrowStr) return;
    MailApp.sendEmail({
      to: v[5],
      subject: "Reminder: your appointment tomorrow — " + CONFIG.BUSINESS_NAME,
      name: CONFIG.BUSINESS_NAME,
      body:
        "Hi " + v[4] + ",\n\n" +
        "A friendly reminder about your appointment tomorrow:\n\n" +
        "Service: " + v[7] + "\n" +
        "Time: " + niceTime_(v[10], tz) + "\n\n" +
        "Please arrive with clean skin and no makeup around the brow/eye area. " +
        "If you wear contacts and are booked for lashes, bring glasses.\n\n" +
        "Need to change something? Please let us know as soon as possible.\n\n" +
        CONFIG.BUSINESS_NAME
    });
    sheet.getRange(i + 2, 15).setValue("Yes");
  });
}

// One-time: schedules sendReminders to run every morning around 9am.
function installReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendReminders") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendReminders").timeBased().everyDays(1).atHour(9).create();
  SpreadsheetApp.getUi().alert(
    "Daily reminders are on. Each morning around 9am, confirmed clients with an appointment " +
    "the next day get a reminder email.\n\nTip: set your time zone in Apps Script under " +
    "Project Settings so 9am means Toronto time.");
}

// Adds a fake booking and emails you the client + owner emails, so you can
// check everything works without using the website. Delete the test row after.
function testBooking() {
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const d = new Date(); d.setDate(d.getDate() + 1);
  const res = doPost({ postData: { contents: JSON.stringify({
    name: "Test Client",
    email: CONFIG.OWNER_EMAIL,
    phone: "905-555-0100",
    service: "Natural Clusters",
    date: Utilities.formatDate(d, tz, "yyyy-MM-dd"),
    time: "10:00",
    notes: "This is a test booking. Safe to delete."
  }) } });
  SpreadsheetApp.getUi().alert("Result: " + res.getContent() +
    "\n\nCheck the Bookings and Clients tabs and your inbox. Delete the test rows when you're done.");
}

function selectedBookingRow_() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== BOOKINGS_TAB) {
    ui.alert("Go to the Bookings tab and click a booking row first."); return null;
  }
  const n = sheet.getActiveRange().getRow();
  if (n < 2) { ui.alert("Click a booking row first (not the header)."); return null; }
  const values = sheet.getRange(n, 1, 1, BOOKING_HEADERS.length).getValues()[0];
  if (!values[0]) { ui.alert("That row is empty."); return null; }
  return { sheet: sheet, number: n, values: values };
}

function niceDate_(d, tz) {
  return d instanceof Date ? Utilities.formatDate(d, tz, "EEEE, MMMM d, yyyy") : String(d);
}
function niceTime_(t, tz) {
  const s = t instanceof Date ? Utilities.formatDate(t, tz, "HH:mm") : String(t);
  const m = toMinutes_(s);
  const h = Math.floor(m / 60), mm = m % 60;
  return ((h % 12) || 12) + ":" + String(mm).padStart(2, "0") + (h < 12 ? " AM" : " PM");
}

// ============ HELPERS ============
function toMinutes_(hhmm) {
  const p = String(hhmm).split(":");
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}
function clean_(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}