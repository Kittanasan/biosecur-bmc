/**
 * ที่เก็บข้อมูลกลางของระบบบันทึกข้อมูลการเลี้ยงกุ้ง (Biosecurity)
 * ใช้ Google Sheets เป็นฐานข้อมูล ผ่าน Google Apps Script (Web App)
 *
 * วิธีติดตั้ง ดูไฟล์ SETUP-GOOGLE-SHEETS.md
 *
 * หลักการ:
 *  - ทุกคนที่มีลิงก์ "ดู" ข้อมูลได้ (action=pull ผ่าน GET ไม่ต้องใช้รหัส)
 *  - การเพิ่ม/แก้/ลบ ต้องส่งรหัสทีม (SHARED_KEY) ที่ตรงกัน
 *  - 1 หมวดข้อมูล = 1 แท็บใน Google Sheets, 1 รายการ = 1 แถว
 *    แถวที่ 1 = หัวคอลัมน์ภาษาไทย, แถวที่ 2 = รหัสคอลัมน์ของระบบ (ซ่อนไว้ ห้ามลบ)
 *    ข้อมูลเริ่มที่แถวที่ 3
 *  - ห้ามเรียงลำดับ/ลบคอลัมน์ในแท็บเหล่านี้ (แก้ข้อความในเซลล์ได้ แต่ถ้าแอปซิงก์รายการนั้นอีกครั้ง
 *    ค่าที่ใหม่กว่าของแอปจะทับ)
 */

// ====== ตั้งค่า (แก้ 2 บรรทัดนี้ก่อนนำไปใช้) ======

// รหัสผ่านของทีม ใช้ยืนยันสิทธิ์ "เขียน" (เพิ่ม/แก้/ลบ) ตั้งให้เดายาก และแจกเฉพาะผู้บันทึกข้อมูล
var SHARED_KEY = "เปลี่ยนรหัสนี้ก่อนใช้งาน";

// หมวดที่ต้องการซ่อนจากคนที่ไม่มีรหัส เช่น ["access"] = ซ่อนสมุดเข้า-ออกฟาร์ม (มีชื่อบุคคล)
// ค่าเริ่มต้นว่าง = ทุกคนที่มีลิงก์เห็นทุกหมวด
var PUBLIC_HIDE_MODULES = [];

// ====== ส่วนที่ไม่ต้องแก้ ======
var DEFAULT_KEY = "เปลี่ยนรหัสนี้ก่อนใช้งาน";
var HEADER_ROWS = 2;
var META = [
  { k: "id", label: "รหัสรายการ", num: false },
  { k: "updatedAt", label: "แก้ไขล่าสุด (ms)", num: true },
  { k: "syncedAt", label: "ซิงก์ล่าสุด (ms)", num: true },
  { k: "deleted", label: "ลบแล้ว", num: false, bool: true }
];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** อ่านข้อมูล (ทุกคน): ?action=pull&since=<ตัวเลข> หรือ ?action=ping */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === "ping") return json_({ ok: true, app: "biosecurity-shrimp", version: 1, needsSetup: needsSetup_() });
    var res = pull_(p.since === undefined ? 0 : Number(p.since), false);
    return json_(res);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** เขียนข้อมูล (ต้องมีรหัส): body = JSON { action:"push", key, since, modules:{ <หมวด>:{ title, columns, records } } } */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.action === "ping") return json_({ ok: true, app: "biosecurity-shrimp", version: 1, keyOk: keyOk_(body.key) });
    if (body.action !== "push") return json_({ ok: false, error: "unknown_action" });
    return json_(push_(body));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function needsSetup_() { return !SHARED_KEY || SHARED_KEY === DEFAULT_KEY; }
function keyOk_(key) { return !needsSetup_() && String(key || "") === SHARED_KEY; }

function props_() { return PropertiesService.getScriptProperties(); }
function readMods_() {
  try { return JSON.parse(props_().getProperty("MODS") || "{}"); } catch (e) { return {}; }
}

/** แท็บของหมวด: คืน { sheet, keys:[{k,num}] } (สร้างหัวตาราง/คอลัมน์ใหม่ให้ถ้ายังไม่มี) */
function ensureSheet_(ss, title, columns, records) {
  var sheet = ss.getSheetByName(title);
  var wanted = [];
  (columns || []).forEach(function (c) { wanted.push({ k: String(c[0]), label: String(c[1] || c[0]), num: c[2] === "num" }); });
  (records || []).forEach(function (r) {
    Object.keys(r).forEach(function (k) {
      if (k === "id" || k === "updatedAt" || k === "syncedAt" || k === "deleted") return;
      if (!wanted.some(function (w) { return w.k === k; })) wanted.push({ k: k, label: k, num: false });
    });
  });
  META.forEach(function (m) { wanted.push({ k: m.k, label: m.label, num: m.num, bool: m.bool }); });

  var existing = [];
  var created = false;
  if (!sheet) {
    sheet = ss.insertSheet(title);
    created = true;
  } else if (sheet.getLastColumn() > 0) {
    existing = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (v) { return String(v || ""); });
  }
  var keys = existing.map(function (s) { var p = s.split("|"); return { k: p[0], num: p[1] === "n" }; });

  var added = [];
  wanted.forEach(function (w) {
    if (!keys.some(function (x) { return x.k === w.k; })) {
      keys.push({ k: w.k, num: !!w.num });
      added.push(w);
    }
  });
  if (added.length) {
    var startCol = keys.length - added.length + 1;
    if (sheet.getMaxColumns() < keys.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), keys.length - sheet.getMaxColumns());
    sheet.getRange(1, startCol, 1, added.length).setValues([added.map(function (w) { return w.label; })]);
    sheet.getRange(2, startCol, 1, added.length).setValues([added.map(function (w) { return w.k + (w.num ? "|n" : ""); })]);
    // คอลัมน์ข้อความ: ตั้งเป็น "ข้อความ" กันชีตแปลงเป็นวันที่/สูตรเอง (เช่น 1/2, =SUM)
    added.forEach(function (w, i) {
      if (!w.num && !w.bool) {
        sheet.getRange(HEADER_ROWS + 1, startCol + i, Math.max(sheet.getMaxRows() - HEADER_ROWS, 1), 1).setNumberFormat("@");
      }
    });
    var head = sheet.getRange(1, 1, 1, keys.length);
    head.setFontWeight("bold");
    head.setBackground("#e3f2f8");
    if (created) {
      sheet.setFrozenRows(1);
      sheet.hideRows(2);
    }
  }
  return { sheet: sheet, keys: keys };
}

/** อ่านทุกแถวของแท็บ เป็นรายการ object */
function readRows_(sheet) {
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastCol < 1 || lastRow <= HEADER_ROWS) return [];
  var keys = sheet.getRange(2, 1, 1, lastCol).getValues()[0].map(function (s) {
    var p = String(s || "").split("|");
    return { k: p[0], num: p[1] === "n" };
  });
  var data = sheet.getRange(HEADER_ROWS + 1, 1, lastRow - HEADER_ROWS, lastCol).getValues();
  var tz = Session.getScriptTimeZone();
  var out = [];
  data.forEach(function (row) {
    var rec = {};
    keys.forEach(function (c, i) {
      if (!c.k) return;
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm") ;
      rec[c.k] = v === null || v === undefined ? "" : v;
    });
    if (!rec.id) return;
    rec.deleted = rec.deleted === true || String(rec.deleted).toUpperCase() === "TRUE";
    rec.updatedAt = Number(rec.updatedAt) || 0;
    rec.syncedAt = Number(rec.syncedAt) || 0;
    out.push(rec);
  });
  return out;
}

function pull_(since, authorized) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mods = readMods_();
  var out = {};
  Object.keys(mods).forEach(function (key) {
    if (!authorized && PUBLIC_HIDE_MODULES.indexOf(key) !== -1) return;
    var sheet = ss.getSheetByName(mods[key]);
    if (!sheet) return;
    var rows = readRows_(sheet).filter(function (r) { return r.syncedAt > since; }).map(function (r) {
      if (r.deleted) return { id: r.id, updatedAt: r.updatedAt, syncedAt: r.syncedAt, deleted: true };
      return r;
    });
    if (rows.length) out[key] = rows;
  });
  return {
    ok: true,
    cursor: Number(props_().getProperty("LAST_STAMP") || 0),
    serverTime: Date.now(),
    hidden: authorized ? [] : PUBLIC_HIDE_MODULES.slice(),
    records: out
  };
}

function coerce_(v, col) {
  if (v === undefined || v === null) return "";
  if (col.bool) return v === true;
  if (col.num) {
    if (typeof v === "number") return isFinite(v) ? v : "";
    var n = parseFloat(v);
    return isFinite(n) && String(v).trim() !== "" ? n : "";
  }
  return String(v);
}

function push_(body) {
  if (!keyOk_(body.key)) return { ok: false, error: needsSetup_() ? "not_configured" : "bad_key" };
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var props = props_();
    var mods = readMods_();
    var stamp = Math.max(Date.now(), Number(props.getProperty("LAST_STAMP") || 0) + 1);
    var written = 0, skipped = 0;
    var modules = body.modules || {};

    Object.keys(modules).forEach(function (key) {
      var spec = modules[key] || {};
      var recs = (spec.records || []).filter(function (r) { return r && r.id; });
      if (!recs.length) return;
      var title = String(spec.title || key).replace(/[\[\]\*\?\/\\:]/g, "-").slice(0, 90);
      mods[key] = mods[key] || title;
      var es = ensureSheet_(ss, mods[key], spec.columns, recs);
      var sheet = es.sheet, keys = es.keys;
      var width = keys.length;
      var idCol = keys.map(function (c) { return c.k; }).indexOf("id");
      var updCol = keys.map(function (c) { return c.k; }).indexOf("updatedAt");
      var lastRow = sheet.getLastRow();
      var data = lastRow > HEADER_ROWS ? sheet.getRange(HEADER_ROWS + 1, 1, lastRow - HEADER_ROWS, sheet.getLastColumn()).getValues() : [];
      data = data.map(function (row) { while (row.length < width) row.push(""); return row; });
      var byId = {};
      data.forEach(function (row, i) { byId[String(row[idCol])] = i; });

      recs.forEach(function (r) {
        var id = String(r.id);
        var inc = Number(r.updatedAt) || 0;
        var idx = byId[id];
        if (idx !== undefined && (Number(data[idx][updCol]) || 0) >= inc) { skipped++; return; }  // ในชีตใหม่กว่า/เท่ากัน
        var row = keys.map(function (c) {
          if (c.k === "id") return id;
          if (c.k === "updatedAt") return inc;
          if (c.k === "syncedAt") return stamp;
          if (c.k === "deleted") return r.deleted === true;
          if (r.deleted === true) return "";          // รายการที่ลบ: ล้างข้อมูลส่วนบุคคลออก เหลือแค่รหัส
          return coerce_(r[c.k], c);
        });
        if (idx === undefined) { byId[id] = data.length; data.push(row); }
        else data[idx] = row;
        written++;
      });

      if (data.length) {
        var needRows = HEADER_ROWS + data.length;
        if (sheet.getMaxRows() < needRows) sheet.insertRowsAfter(sheet.getMaxRows(), needRows - sheet.getMaxRows());
        sheet.getRange(HEADER_ROWS + 1, 1, data.length, width).setValues(data);
      }
    });

    if (written) props.setProperty("LAST_STAMP", String(stamp));
    props.setProperty("MODS", JSON.stringify(mods));

    var res = { ok: true, written: written, skipped: skipped, cursor: Number(props.getProperty("LAST_STAMP") || 0), serverTime: Date.now(), records: {} };
    if (body.since !== undefined && Number(body.since) >= 0) {
      var pulled = pull_(Number(body.since), true);
      res.records = pulled.records;
    }
    return res;
  } finally {
    lock.releaseLock();
  }
}
