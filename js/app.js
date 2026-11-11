/* ==================================================================
   ระบบบันทึกข้อมูลการเลี้ยงกุ้ง (Biosecurity) — สคริปต์หลักของหน้าจอ
   ศูนย์วิจัยและพัฒนาการเพาะเลี้ยงสัตว์น้ำชายฝั่งฉะเชิงเทรา

   โครงสร้าง:
     1) storage            เก็บข้อมูลใน localStorage (มี fallback เป็นหน่วยความจำ)
     2) helpers            วันที่ ตัวเลข ตาราง
     3) toast / confirm / panels
     4) MOD (schema)       นิยามของทั้ง 9 หมวด: ฟิลด์ในฟอร์ม การตรวจสอบ คอลัมน์ตาราง
     5) ฟอร์ม/ตาราง/แก้ไข  ทำงานจาก MOD ชุดเดียว (เพิ่มหมวดใหม่ = เพิ่มใน MOD + HTML ฟอร์ม/ตาราง)
     6) ผู้บันทึก + รายชื่อผู้บันทึก (แก้ไขได้จากหน้าจอ)
     7) รายงาน / ส่งออก / นำเข้า (ใช้ BioReport จาก js/report.js)
     8) ช่องวันที่/เวลาสำรองสำหรับเบราว์เซอร์รุ่นเก่า
     9) init
   ================================================================== */
(function () {
  "use strict";

  var KEY = "biosecurity-shrimp-v1";
  var STAFF_KEY = "biosecurity-shrimp-staff";
  var FILTER_KEY = "biosecurity-shrimp-filters";
  var MODULES = ["access", "feed", "health", "water", "matwater", "footbath", "equipment", "watersource", "move"];

  /* ================================================================
     1) storage (รองรับทุกเบราว์เซอร์/ทุกแพลตฟอร์ม)
     ================================================================ */
  var store = (function () {
    var memory = {};                       // fallback: โหมดส่วนตัวของ iOS/Safari หรือเบราว์เซอร์ที่บล็อก storage
    var lib = null;
    try {
      lib = window.localStorage;
      var probe = "__bio_probe__";
      lib.setItem(probe, "1");
      lib.removeItem(probe);
    } catch (e) {
      lib = null;
    }
    return {
      available: !!lib,
      get: function (k) {
        try { return lib ? lib.getItem(k) : (memory[k] || null); }
        catch (e) { return memory[k] || null; }
      },
      set: function (k, v) {
        if (lib) {
          try { lib.setItem(k, v); return true; }
          catch (e) {
            // พื้นที่เต็ม: ลองลบเฉพาะรายการชั่วคราวก่อน 1 ครั้ง
            try { lib.removeItem("__bio_tmp__"); lib.setItem(k, v); return true; } catch (e2) {}
            memory[k] = v;
            return false;
          }
        }
        memory[k] = v;
        return "memory";
      }
    };
  })();

  function loadAll() {
    var data = {};
    MODULES.forEach(function (m) { data[m] = []; });
    try {
      var raw = store.get(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        MODULES.forEach(function (m) {
          if (Array.isArray(parsed[m])) data[m] = parsed[m];
        });
      }
    } catch (e) {
      console.warn("อ่านข้อมูลไม่สำเร็จ", e);
      setTimeout(function () { toast("อ่านข้อมูลที่บันทึกไว้ไม่สำเร็จ", "err"); }, 0);
    }
    return data;
  }
  function saveAll(data) {
    var ok = store.set(KEY, JSON.stringify(data));
    if (ok === false) {
      toast("บันทึกข้อมูลไม่สำเร็จ (พื้นที่เก็บข้อมูลเต็ม) กรุณาส่งออก JSON เก็บไว้ก่อน", "err");
      return false;
    }
    if (ok === "memory" && !saveAll.warned) {
      saveAll.warned = true;
      toast("เบราว์เซอร์นี้ปิดการเก็บข้อมูลถาวร ข้อมูลจะหายเมื่อปิดหน้า กรุณาใช้โหมดปกติหรือส่งออก JSON", "err");
    }
    return true;
  }
  var DB = loadAll();

  /* ================================================================
     2) helpers
     ================================================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id) { return document.getElementById(id); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad2(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

  /* วันที่ตามเวลาเครื่อง (ไม่ใช้ toISOString เพราะเป็นเวลา UTC จะเลื่อนวันก่อน 07.00 น.) */
  function isoOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function daysAgoISO(n) { var d = new Date(); d.setDate(d.getDate() - n); return isoOf(d); }
  function nowHM() { var d = new Date(); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }

  var TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  function thDate(iso) {
    if (!iso) return "-";
    var p = String(iso).split("-");
    if (p.length !== 3) return String(iso);
    var y = parseInt(p[0], 10) + 543;
    var mo = TH_MONTHS[parseInt(p[1], 10) - 1] || p[1];
    return String(parseInt(p[2], 10)) + " " + mo + " " + String(y).slice(-2);
  }
  function longThaiToday() {
    var d = new Date();
    return "วันนี้ " + d.getDate() + " " + TH_MONTHS[d.getMonth()] + " " + (d.getFullYear() + 543);
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function fmt2(v) { return num(v).toFixed(2); }
  function fmtOr(v, dec) { return v === "" || v === null || v === undefined ? "-" : num(v).toFixed(dec); }
  function td(text, cls) {
    var cell = document.createElement("td");
    if (cls) cell.className = cls;
    cell.textContent = (text === null || text === undefined || text === "") ? "-" : String(text);
    return cell;
  }
  function fire(el, type) {
    try {
      var ev = document.createEvent("HTMLEvents");
      ev.initEvent(type, true, false);
      el.dispatchEvent(ev);
    } catch (e) {}
  }

  /* ================================================================
     3) toast / confirm / panels
     ================================================================ */
  var toastEl = byId("toast"), toastTimer = null;
  var lastSaveWasEdit = false;
  function toast(msg, kind) {
    if (lastSaveWasEdit) {
      if (kind === "ok") msg = "แก้ไขรายการเรียบร้อยแล้ว";
      lastSaveWasEdit = false;
    }
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = "toast"; }, 2600);
  }

  var confirmEl = byId("confirmBox"), confirmResolve = null;
  function askConfirm(text, okLabel) {
    byId("confirmText").textContent = text;
    byId("confirmOk").textContent = okLabel || "ลบรายการ";
    confirmEl.classList.add("open");
    byId("confirmOk").focus();
    return new Promise(function (resolve) { confirmResolve = resolve; });
  }
  function closeConfirm(result) {
    confirmEl.classList.remove("open");
    if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
  }
  byId("confirmCancel").addEventListener("click", function () { closeConfirm(false); });
  byId("confirmOk").addEventListener("click", function () { closeConfirm(true); });
  confirmEl.addEventListener("click", function (e) { if (e.target === confirmEl) closeConfirm(false); });

  var overlay = byId("overlay");
  var openPanelId = null;
  function openPanel(name) {
    closeAllPanels();
    var p = byId("panel-" + name);
    if (!p) return;
    if (name === "report") { buildReportPicks(); refreshReportSummary(); }
    if (name === "staff") renderStaffList();
    p.classList.add("open");
    overlay.classList.add("open");
    openPanelId = name;
    document.body.style.overflow = "hidden";
    p.scrollTop = 0;
    var first = p.querySelector("input, select, textarea, button");
    if (first) first.focus();
  }
  function closeAllPanels() {
    $all(".panel.open").forEach(function (p) { p.classList.remove("open"); });
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    openPanelId = null;
  }
  $all("[data-open]").forEach(function (btn) {
    btn.addEventListener("click", function () { openPanel(btn.getAttribute("data-open")); });
  });
  $all("[data-close]").forEach(function (btn) { btn.addEventListener("click", closeAllPanels); });
  overlay.addEventListener("click", closeAllPanels);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (confirmEl.classList.contains("open")) { closeConfirm(false); return; }
    if (openPanelId) closeAllPanels();
  });

  /* ---------------- validation ---------------- */
  function clearErr(id) {
    var box = document.querySelector('.err[data-err="' + id + '"]');
    if (box) box.classList.remove("show");
    var el = byId(id);
    if (el) el.classList.remove("bad");
    if (el && el._dtPicker) {
      el._dtPicker.classList.remove("bad");
      try { el._dtPicker.removeAttribute("title"); } catch (e2) {}
    }
  }
  function setErr(id, msg) {
    var box = document.querySelector('.err[data-err="' + id + '"]');
    if (box) {
      if (msg) box.textContent = msg;
      box.classList.add("show");
    }
    var el = byId(id);
    if (el) el.classList.add("bad");
    // ช่องวันที่ที่ถูกแปลงเป็นช่องข้อความ: ทำเครื่องหมายที่ช่องที่ผู้ใช้เห็นแทน
    if (el && el._dtPicker && msg) {
      el._dtPicker.classList.add("bad");
      try { el._dtPicker.setAttribute("title", msg); } catch (e2) {}
    }
  }
  function reqText(id, label) {
    var v = (byId(id).value || "").trim();
    if (!v) { setErr(id, "กรุณาระบุ" + label); return null; }
    clearErr(id);
    return v;
  }
  /* ตัวเลขไม่บังคับ: คืน "" ถ้าว่าง, undefined ถ้าไม่ถูกต้อง */
  function optNum(id, opts) {
    opts = opts || {};
    var raw = (byId(id).value || "").trim();
    if (raw === "") { clearErr(id); return ""; }
    var n = parseFloat(raw);
    if (!isFinite(n) || n < 0) { setErr(id, "กรอกตัวเลขไม่ติดลบ"); return undefined; }
    if (opts.max !== undefined && n > opts.max) {
      setErr(id, opts.msgMax || ("ค่าต้องไม่เกิน " + opts.max));
      return undefined;
    }
    clearErr(id);
    return n;
  }
  function clearFormErrors(form) {
    $all(".err.show", form).forEach(function (e) { e.classList.remove("show"); });
    $all(".bad", form).forEach(function (e) { e.classList.remove("bad"); });
  }
  function focusFirstBad(form) {
    var bad = form.querySelector(".bad");
    if (bad) bad.focus();
    toast("กรุณาตรวจสอบข้อมูลที่ยังไม่ครบหรือไม่ถูกต้อง", "err");
  }

  /* ================================================================
     4) MOD — นิยามของแต่ละหมวด
        fields: k = ชื่อฟิลด์ในข้อมูล, id = ช่องในฟอร์ม
                req = ข้อความ "กรุณาระบุ..." (บังคับกรอก)
                num = true หรือ { max, msgMax } (ตัวเลขไม่ติดลบ ไม่บังคับ)
                อื่น ๆ = ข้อความ/ตัวเลือก (ตัดช่องว่างหัวท้าย)
        keep:  ฟิลด์ที่คงค่าไว้หลังบันทึก (เช่น บ่อ) เพื่อกรอกรายการถัดไปเร็วขึ้น
        sort2: เรียงลำดับรองภายในวันเดียวกัน [ฟิลด์, 1=น้อยไปมาก / -1=มากไปน้อย]
        cols:  คอลัมน์ในตาราง (ต้องตรงกับ <thead> ใน index.html)
     ================================================================ */
  var NUM_TEMP = { max: 45, msgMax: "อุณหภูมิต้องอยู่ระหว่าง 0-45 °C" };
  var NUM_PH = { max: 14, msgMax: "ค่า pH ต้องอยู่ระหว่าง 0-14" };
  var NUM_SAL = { max: 60, msgMax: "ค่าความเค็มต้องอยู่ระหว่าง 0-60 ppt" };

  /* ตัวช่วยสร้างคอลัมน์ */
  function D() { return function (r) { return td(thDate(r.date)); }; }
  function T(k) { return function (r) { return td(r[k]); }; }
  function N(k, dec) { return function (r) { return td(fmtOr(r[k], dec), "num"); }; }
  function F2(k) { return function (r) { return td(fmt2(r[k]), "num"); }; }
  function I(k) { return function (r) { return td(r[k] === "" ? "" : num(r[k]), "num"); }; }
  function REC() { return function (r) { return td(r.recorder || "-", "rec-cell"); }; }

  function feedTotal(r) { return num(r.feed0830) + num(r.feed1200) + num(r.feed1600) + num(r.feed2000); }

  var MOD = {
    access: {
      prefix: "a", form: "formAccess", dom: "Access", badge: "accessCount", cnt: "cntAccess",
      saved: "บันทึกข้อมูลการเข้าออกฟาร์มแล้ว",
      sort2: ["timeIn", -1], keep: [],
      fields: [
        { k: "date", id: "a_date", req: "วันที่" },
        { k: "timeIn", id: "a_in", req: "เวลาเข้า" },
        { k: "timeOut", id: "a_out" },
        { k: "type", id: "a_type" },
        { k: "fullName", id: "a_name", req: "ชื่อ-นามสกุล" },
        { k: "organization", id: "a_org", req: "หน่วยงาน/ที่ทำงาน" },
        { k: "objective", id: "a_objective", req: "วัตถุประสงค์การเข้าฟาร์ม" },
        { k: "note", id: "a_note" }
      ],
      check: function (rec) {
        clearErr("a_out");
        if (rec.timeOut && rec.timeIn && rec.timeOut < rec.timeIn) {
          setErr("a_out", "เวลาออกต้องไม่ก่อนเวลาเข้า");
          return false;
        }
        return true;
      },
      cols: [D(), T("timeIn"), T("timeOut"), T("fullName"), T("organization"), T("objective"), REC(), T("note")]
    },
    feed: {
      prefix: "f", form: "formFeed", dom: "Feed", badge: "feedCount", cnt: "cntFeed",
      saved: "บันทึกการให้อาหารและอุณหภูมิแล้ว",
      sort2: ["pond", 1], keep: ["pond"],
      fields: [
        { k: "date", id: "f_date", req: "วันที่" },
        { k: "pond", id: "f_pond", req: "บ่อ" },
        { k: "age", id: "f_age", num: { max: 365, msgMax: "อายุไม่ควรเกิน 365 วัน" } },
        { k: "feed0830", id: "f_f0830", num: true },
        { k: "feed1200", id: "f_f1200", num: true },
        { k: "feed1600", id: "f_f1600", num: true },
        { k: "feed2000", id: "f_f2000", num: true },
        { k: "temp0830", id: "f_t0830", num: NUM_TEMP },
        { k: "temp1500", id: "f_t1500", num: NUM_TEMP },
        { k: "note", id: "f_note" }
      ],
      cols: [D(), T("pond"), I("age"), F2("feed0830"), F2("feed1200"), F2("feed1600"), F2("feed2000"),
             function (r) { return td(fmt2(feedTotal(r)), "num"); },
             N("temp0830", 1), N("temp1500", 1), REC(), T("note")]
    },
    health: {
      prefix: "h", form: "formHealth", dom: "Health", badge: "healthCount", cnt: "cntHealth",
      saved: "บันทึกสุขภาพสัตว์น้ำแล้ว",
      sort2: ["pond", 1], keep: ["pond"],
      fields: [
        { k: "date", id: "h_date", req: "วันที่" },
        { k: "pond", id: "h_pond", req: "เลขที่บ่อ" },
        { k: "gut0830", id: "h_gut0830" },
        { k: "white0830", id: "h_white0830" },
        { k: "dead0830", id: "h_dead0830", num: { max: 1000000, msgMax: "จำนวนมากเกินไป" } },
        { k: "gut1600", id: "h_gut1600" },
        { k: "white1600", id: "h_white1600" },
        { k: "dead1600", id: "h_dead1600", num: { max: 1000000, msgMax: "จำนวนมากเกินไป" } },
        { k: "feedManagement", id: "h_feed" },
        { k: "note", id: "h_note" }
      ],
      cols: [D(), T("pond"), T("gut0830"), T("white0830"), I("dead0830"), T("gut1600"), T("white1600"), I("dead1600"),
             function (r) { return td(num(r.dead0830) + num(r.dead1600), "num"); },
             T("feedManagement"), REC(), T("note")]
    },
    water: {
      prefix: "w", form: "formWater", dom: "Water", badge: "waterCount", cnt: "cntWater",
      saved: "บันทึกคุณภาพน้ำแล้ว",
      sort2: ["pond", 1], keep: ["pond"],
      fields: [
        { k: "date", id: "w_date", req: "วันที่" },
        { k: "time", id: "w_time" },
        { k: "pond", id: "w_pond", req: "เลขที่บ่อ" },
        { k: "ammonia", id: "w_nh3", num: true },
        { k: "nitrite", id: "w_no2", num: true },
        { k: "dox", id: "w_dox", num: true },
        { k: "ph", id: "w_ph", num: NUM_PH },
        { k: "magnesium", id: "w_mg", num: true },
        { k: "calcium", id: "w_ca", num: true },
        { k: "salinity", id: "w_sal", num: NUM_SAL },
        { k: "note", id: "w_note" }
      ],
      cols: [D(), T("time"), T("pond"), N("ammonia", 3), N("nitrite", 3), N("dox", 2), N("ph", 2),
             N("magnesium", 2), N("calcium", 2), N("salinity", 1), REC(), T("note")]
    },
    matwater: {
      prefix: "mw", form: "formMatWater", dom: "MatWater", badge: "matwaterCount", cnt: "cntMatWater",
      saved: "บันทึกวัสดุที่ใช้ในการเตรียมน้ำแล้ว",
      sort2: ["pond", 1], keep: ["pond"],
      fields: [
        { k: "date", id: "mw_date", req: "วันที่" },
        { k: "pond", id: "mw_pond", req: "เลขบ่อ" },
        { k: "chem", id: "mw_chem", req: "ชนิดสารเคมี" },
        { k: "brand", id: "mw_brand" },
        { k: "company", id: "mw_company" },
        { k: "reg", id: "mw_reg" },
        { k: "qty", id: "mw_qty", num: true },
        { k: "volume", id: "mw_volume", num: true },
        { k: "note", id: "mw_note" }
      ],
      cols: [D(), T("pond"), T("chem"), T("brand"), T("company"), T("reg"), N("qty", 2), N("volume", 2), REC(), T("note")]
    },
    footbath: {
      prefix: "fb", form: "formFootbath", dom: "Footbath", badge: "footbathCount", cnt: "cntFootbath",
      saved: "บันทึกวัสดุอ่างย่ำเท้าแล้ว",
      sort2: ["chem", 1], keep: [],
      fields: [
        { k: "date", id: "fb_date", req: "วันที่" },
        { k: "chem", id: "fb_chem", req: "ชนิดสารเคมี" },
        { k: "brand", id: "fb_brand" },
        { k: "reg", id: "fb_reg" },
        { k: "qty", id: "fb_qty", num: true },
        { k: "size", id: "fb_size", num: true },
        { k: "place", id: "fb_place" },
        { k: "note", id: "fb_note" }
      ],
      cols: [D(), T("chem"), T("brand"), T("reg"), N("qty", 2), N("size", 2), T("place"), REC(), T("note")]
    },
    equipment: {
      prefix: "eq", form: "formEquipment", dom: "Equipment", badge: "equipmentCount", cnt: "cntEquipment",
      saved: "บันทึกวัสดุล้างอุปกรณ์แล้ว",
      sort2: ["chem", 1], keep: [],
      fields: [
        { k: "date", id: "eq_date", req: "วันที่" },
        { k: "chem", id: "eq_chem", req: "ชนิดสารเคมี" },
        { k: "brand", id: "eq_brand" },
        { k: "reg", id: "eq_reg" },
        { k: "qty", id: "eq_qty", num: true },
        { k: "pond", id: "eq_pond" },
        { k: "item", id: "eq_item" },
        { k: "note", id: "eq_note" }
      ],
      cols: [D(), T("chem"), T("brand"), T("reg"), N("qty", 2), T("pond"), T("item"), REC(), T("note")]
    },
    watersource: {
      prefix: "ws", form: "formWaterSource", dom: "WaterSource", badge: "watersourceCount", cnt: "cntWaterSrc",
      saved: "บันทึกแหล่งน้ำใช้แล้ว",
      sort2: ["source", 1], keep: [],
      fields: [
        { k: "date", id: "ws_date", req: "วันที่" },
        { k: "source", id: "ws_source", req: "แหล่งน้ำที่ใช้" },
        { k: "pond", id: "ws_pond" },
        { k: "qty", id: "ws_qty", num: true },
        { k: "salinity", id: "ws_sal", num: NUM_SAL },
        { k: "ph", id: "ws_ph", num: NUM_PH },
        { k: "treatment", id: "ws_treat" },
        { k: "result", id: "ws_result" },
        { k: "note", id: "ws_note" }
      ],
      cols: [D(), T("source"), T("pond"), N("qty", 2), N("salinity", 1), N("ph", 2), T("treatment"), T("result"), REC(), T("note")]
    },
    move: {
      prefix: "mv", form: "formMove", dom: "Move", badge: "moveCount", cnt: "cntMove",
      saved: "บันทึกการเคลื่อนย้ายสัตว์น้ำแล้ว",
      sort2: ["from", 1], keep: [],
      fields: [
        { k: "date", id: "mv_date", req: "วันที่" },
        { k: "type", id: "mv_type" },
        { k: "from", id: "mv_from", req: "ต้นทาง" },
        { k: "to", id: "mv_to", req: "ปลายทาง" },
        { k: "species", id: "mv_species" },
        { k: "count", id: "mv_count", num: { max: 100000000, msgMax: "จำนวนมากเกินไป" } },
        { k: "weight", id: "mv_weight", num: true },
        { k: "method", id: "mv_method" },
        { k: "sender", id: "mv_sender" },
        { k: "receiver", id: "mv_receiver" },
        { k: "doc", id: "mv_doc" },
        { k: "note", id: "mv_note" }
      ],
      cols: [D(), T("type"), T("from"), T("to"), T("species"), I("count"), N("weight", 2), T("method"),
             T("sender"), T("receiver"), T("doc"), REC(), T("note")]
    }
  };
  function formOf(m) { return byId(MOD[m].form); }
  function fieldOf(m, k) {
    var fs = MOD[m].fields;
    for (var i = 0; i < fs.length; i++) if (fs[i].k === k) return fs[i];
    return null;
  }

  /* ================================================================
     5) ฟอร์ม / ตาราง / แก้ไข / ตัวกรอง
     ================================================================ */
  var editing = {};            // หมวด -> id ของรายการที่กำลังแก้ไข

  /* ---------- ตัวกรอง "ดูข้อมูล" ---------- */
  var FILTER_OPTS = [["5", "5 วันล่าสุด"], ["30", "30 วันล่าสุด"], ["90", "90 วันล่าสุด"], ["month", "เดือนนี้"], ["all", "ทั้งหมด"]];
  function filterByRange(m, rows) {
    var sel = document.querySelector('[data-filter="' + m + '"]');
    var v = sel ? sel.value : "all";
    if (v === "all") return rows;
    if (v === "month") {
      var ym = todayISO().slice(0, 7);
      return rows.filter(function (r) { return String(r.date || "").slice(0, 7) === ym; });
    }
    var n = parseInt(v, 10);
    if (!isFinite(n) || n < 1) return rows;
    var from = daysAgoISO(n - 1);
    return rows.filter(function (r) { return String(r.date || "") >= from; });
  }
  function initFilters() {
    var saved = {};
    try { saved = JSON.parse(store.get(FILTER_KEY) || "{}") || {}; } catch (e) { saved = {}; }
    $all("[data-filter]").forEach(function (sel) {
      var m = sel.getAttribute("data-filter");
      sel.textContent = "";
      FILTER_OPTS.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o[0];
        opt.textContent = o[1];
        sel.appendChild(opt);
      });
      var want = saved[m];
      sel.value = FILTER_OPTS.some(function (o) { return o[0] === want; }) ? want : "30";
      sel.addEventListener("change", function () {
        saved[m] = sel.value;
        store.set(FILTER_KEY, JSON.stringify(saved));
        renderModule(m);
      });
    });
  }

  /* ---------- ตาราง ---------- */
  function actionCell(m, id) {
    var cell = document.createElement("td");
    var box = document.createElement("div");
    box.className = "row-actions";
    var isEditing = editing[m] === id;
    var edit = document.createElement("button");
    edit.type = "button";
    edit.className = "mini edit" + (isEditing ? " on" : "");
    edit.textContent = isEditing ? "กำลังแก้ไข" : "แก้ไข";
    edit.setAttribute("aria-label", "แก้ไขรายการนี้");
    edit.addEventListener("click", function () { startEdit(m, id); });
    var del = document.createElement("button");
    del.type = "button";
    del.className = "mini del";
    del.textContent = "ลบ";
    del.setAttribute("aria-label", "ลบรายการนี้");
    del.addEventListener("click", function () { removeRow(m, id); });
    box.appendChild(edit);
    box.appendChild(del);
    cell.appendChild(box);
    return cell;
  }

  function removeRow(m, id) {
    askConfirm("ต้องการลบรายการบันทึกนี้หรือไม่? ข้อมูลที่ลบแล้วจะกู้คืนไม่ได้").then(function (ok) {
      if (!ok) return;
      DB[m] = DB[m].filter(function (r) { return r.id !== id; });
      if (editing[m] === id) formOf(m).reset();
      if (saveAll(DB)) { renderAll(); toast("ลบรายการแล้ว", "ok"); }
    });
  }

  /* แสดง/ซ่อนตาราง + ป้ายจำนวน (count = ผ่านตัวกรอง, total = ทั้งหมดของหมวด) */
  function setWrap(m, count) {
    var spec = MOD[m];
    var total = DB[m].length;
    var empty = byId("empty" + spec.dom);
    var wrap = byId("tbody" + spec.dom).closest(".table-wrap");
    var has = count > 0;
    if (empty) {
      if (empty.dataset.orig === undefined) empty.dataset.orig = empty.innerHTML;
      if (!has && total > 0) {
        empty.textContent = "";
        var s = document.createElement("strong");
        s.textContent = "ไม่มีรายการในช่วงเวลาที่เลือก";
        empty.appendChild(s);
        empty.appendChild(document.createTextNode("มีข้อมูลทั้งหมด " + total +
          " รายการ ลองเปลี่ยนตัวกรอง \"ดูข้อมูล\" ด้านบนเป็น \"ทั้งหมด\""));
      } else {
        empty.innerHTML = empty.dataset.orig;
      }
      empty.hidden = has;
    }
    if (wrap) wrap.style.display = has ? "" : "none";
    byId(spec.badge).textContent = count === total ? count + " รายการ" : count + " จาก " + total + " รายการ";
    byId(spec.cnt).textContent = total + " รายการ";
  }

  function renderModule(m) {
    var spec = MOD[m];
    var tb = byId("tbody" + spec.dom);
    tb.textContent = "";
    var k2 = spec.sort2[0], dir = spec.sort2[1];
    var rows = filterByRange(m, DB[m]).slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return dir * String(a[k2] || "").localeCompare(String(b[k2] || ""));
    });
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      spec.cols.forEach(function (col) { tr.appendChild(col(r)); });
      tr.appendChild(actionCell(m, r.id));
      if (editing[m] === r.id) tr.className = "row-editing";
      tb.appendChild(tr);
    });
    setWrap(m, rows.length);
  }

  /* ---------- การ์ดสรุปหน้าแรก ---------- */
  function setStat(el, value, unit) {
    el.textContent = "";
    el.appendChild(document.createTextNode(value));
    if (unit) {
      var sm = document.createElement("small");
      sm.textContent = unit;
      el.appendChild(sm);
    }
  }
  function countToday(m) {
    var t = todayISO();
    return DB[m].filter(function (r) { return r.date === t; }).length;
  }
  function renderStats() {
    setStat(byId("statAccess"), String(countToday("access")), "รายการ");
    setStat(byId("statFeed"), String(countToday("feed")), "บ่อ");
    setStat(byId("statHealth"), String(countToday("health")), "บ่อ");
    var last = DB.water.slice().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.time || "").localeCompare(b.time || "");
    }).pop();
    if (last) setStat(byId("statWater"), thDate(last.date), last.pond ? "บ่อ " + last.pond : "");
    else setStat(byId("statWater"), "-", "");
    setStat(byId("statMaterial"), String(countToday("matwater") + countToday("footbath") + countToday("equipment")), "รายการ");
    setStat(byId("statWaterSrc"), String(countToday("watersource")), "รายการ");
    setStat(byId("statMove"), String(countToday("move")), "รายการ");
    var total = MODULES.reduce(function (sum, m) { return sum + DB[m].length; }, 0);
    setStat(byId("statTotal"), String(total), "รายการ");
  }

  function renderAll() {
    MODULES.forEach(renderModule);
    renderStats();
  }

  /* ---------- บันทึกฟอร์ม ---------- */
  function readField(f) {
    if (f.req) return reqText(f.id, f.req);                       // null = ยังไม่กรอก
    if (f.num) return optNum(f.id, f.num === true ? {} : f.num);  // undefined = ไม่ถูกต้อง
    var el = byId(f.id);
    return el ? String(el.value || "").trim() : "";
  }

  /* ถ้ากำลังแก้ไขให้แทนที่รายการเดิม (คง id เดิม) ไม่งั้นเพิ่มใหม่ */
  function upsert(m, rec) {
    var eid = editing[m];
    if (eid) {
      for (var i = 0; i < DB[m].length; i++) {
        if (DB[m][i].id === eid) {
          rec.id = eid;
          DB[m][i] = rec;
          lastSaveWasEdit = true;
          return;
        }
      }
    }
    DB[m].push(rec);
  }

  function submitModule(m) {
    var spec = MOD[m], form = formOf(m);
    var rec = { id: uid() }, valid = true;
    spec.fields.forEach(function (f) {
      var v = readField(f);
      if (v === null || v === undefined) valid = false;
      rec[f.k] = v;
    });
    if (spec.check && !spec.check(rec)) valid = false;
    var recorder = readRecorder(m);
    if (!recorder) valid = false;
    if (!valid) { focusFirstBad(form); return; }
    rec.recorder = recorder;

    upsert(m, rec);
    if (!saveAll(DB)) return;
    form.reset();                                   // -> endEdit + ค่าเริ่มต้น (ดู initForms)
    spec.keep.forEach(function (k) { byId(fieldOf(m, k).id).value = rec[k]; });
    renderAll();
    toast(spec.saved, "ok");
  }

  /* ---------- แก้ไขรายการ ---------- */
  function editBanner(form) {
    var b = form.querySelector(".edit-banner");
    if (b) return b;
    b = document.createElement("div");
    b.className = "edit-banner";
    b.hidden = true;
    var txt = document.createElement("span");
    txt.className = "eb-text";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "mini";
    cancel.textContent = "ยกเลิกการแก้ไข";
    cancel.addEventListener("click", function () { form.reset(); });
    b.appendChild(txt);
    b.appendChild(cancel);
    var h3 = form.querySelector("h3");
    form.insertBefore(b, h3 ? h3.nextSibling : form.firstChild);
    return b;
  }
  function submitLabel(form, text) {
    var btn = form.querySelector('button[type="submit"]');
    var node = btn && btn.lastChild;
    if (!node || node.nodeType !== 3) return;
    if (btn.dataset.origLabel === undefined) btn.dataset.origLabel = node.nodeValue;
    node.nodeValue = text === null ? btn.dataset.origLabel : " " + text;
  }

  function startEdit(m, id) {
    var rec = null;
    DB[m].forEach(function (r) { if (r.id === id) rec = r; });
    if (!rec) return;
    var form = formOf(m);
    clearFormErrors(form);
    MOD[m].fields.forEach(function (f) {
      var v = rec[f.k];
      if (v === null || v === undefined) v = "";
      if (f.k === "date") setDateValue(f.id, String(v));
      else byId(f.id).value = String(v);
    });
    fillRecorder(m, rec.recorder);
    if (m === "feed") updateFeedTotal();

    editing[m] = id;
    form.classList.add("is-editing");
    var b = editBanner(form);
    b.querySelector(".eb-text").textContent = "กำลังแก้ไขรายการวันที่ " + thDate(rec.date) +
      " — แก้ไขข้อมูลแล้วกด \"บันทึกการแก้ไข\"";
    b.hidden = false;
    submitLabel(form, "บันทึกการแก้ไข");
    renderModule(m);   // ไฮไลต์แถวที่กำลังแก้ไข
    try { form.scrollIntoView({ behavior: "smooth", block: "start" }); }
    catch (e) { form.scrollIntoView(true); }
  }

  function endEdit(m) {
    if (!editing[m]) return;
    editing[m] = null;
    var form = formOf(m);
    form.classList.remove("is-editing");
    var b = form.querySelector(".edit-banner");
    if (b) b.hidden = true;
    submitLabel(form, null);
    renderModule(m);
  }

  /* ค่าเริ่มต้นของฟอร์ม: ตอนเปิดหน้า หลังบันทึก และหลังกด "ล้างฟอร์ม" */
  function applyDefaults(m) {
    setDateValue(MOD[m].prefix + "_date", todayISO());
    if (m === "access") byId("a_in").value = nowHM();
    if (m === "water") byId("w_time").value = nowHM();
    if (m === "feed") updateFeedTotal();
    resetRecorder(m);
    clearFormErrors(formOf(m));
  }

  function initForms() {
    MODULES.forEach(function (m) {
      var form = formOf(m);
      form.addEventListener("submit", function (e) { e.preventDefault(); submitModule(m); });
      // event "reset" เกิดก่อนเบราว์เซอร์ล้างค่าช่อง จึงตั้งค่าเริ่มต้นใน setTimeout
      form.addEventListener("reset", function () {
        endEdit(m);
        setTimeout(function () { applyDefaults(m); }, 0);
      });
    });
  }

  /* ยอดรวมอาหารแบบสด */
  function updateFeedTotal() {
    var total = num(byId("f_f0830").value) + num(byId("f_f1200").value) +
                num(byId("f_f1600").value) + num(byId("f_f2000").value);
    byId("f_total").value = total.toFixed(2);
  }
  ["f_f0830", "f_f1200", "f_f1600", "f_f2000"].forEach(function (id) {
    byId(id).addEventListener("input", updateFeedTotal);
  });

  /* ================================================================
     6) ผู้บันทึกข้อมูล + รายชื่อผู้บันทึก
     ================================================================ */
  var DEFAULT_STAFF = [
    "นายเจนณรงค์ ละอองสินธุ์",
    "นายกฤษณ์ธนสรรค์ อินทร์บำรุง",
    "นางสาวนฤมล เชื้อน้อย",
    "นายบุญมี อารีเอื้อ",
    "นางสมร สิริโภคา",
    "นายจตุพร ปรัชญา",
    "นางสาวชมพูนุท สามห้วย"
  ];
  var STAFF_OTHER = "__other__";
  var lastRecorder = "";   // เลือกคนเดิมค้างไว้ให้บันทึกครั้งถัดไปสะดวก

  function cleanNames(list) {
    var out = [];
    (list || []).forEach(function (s) {
      var v = String(s === null || s === undefined ? "" : s).replace(/\s+/g, " ").trim();
      if (v && out.indexOf(v) === -1) out.push(v);
    });
    return out;
  }
  var STAFF = (function () {
    try {
      var s = JSON.parse(store.get(STAFF_KEY) || "null");
      if (Array.isArray(s)) return cleanNames(s);
    } catch (e) {}
    return DEFAULT_STAFF.slice();
  })();
  function setStaff(list) {
    // แก้ในอาร์เรย์เดิม เพื่อให้ตัวแปรที่อ้างถึง STAFF เห็นค่าใหม่
    STAFF.length = 0;
    cleanNames(list).forEach(function (n) { STAFF.push(n); });
  }

  function recSel(m) { return byId(MOD[m].prefix + "_rec"); }
  function recOther(m) { return byId(MOD[m].prefix + "_rec_other"); }

  /* สร้างบล็อก "ผู้บันทึกข้อมูล / ลายเซ็น" ในทุกฟอร์ม (เดิมเขียนซ้ำ 9 ชุดใน HTML) */
  function buildRecorderBlocks() {
    MODULES.forEach(function (m) {
      var p = MOD[m].prefix, fs = byId("rec-" + m);
      if (!fs) return;
      fs.innerHTML =
        '<legend>ผู้บันทึกข้อมูล / ลายเซ็น</legend>' +
        '<div class="rec-grid">' +
          '<div class="field">' +
            '<label for="' + p + '_rec">ผู้บันทึกข้อมูล <span class="req">*</span></label>' +
            '<select id="' + p + '_rec" class="rec-select"></select>' +
            '<div class="err" data-err="' + p + '_rec">กรุณาเลือกผู้บันทึกข้อมูล</div>' +
            '<div class="hint">ไม่มีชื่อในรายการ? เพิ่มได้ที่ปุ่ม "รายชื่อผู้บันทึก" หน้าแรก</div>' +
          '</div>' +
          '<div class="field field-other" hidden>' +
            '<label for="' + p + '_rec_other">ระบุชื่อผู้บันทึก (อื่น ๆ)</label>' +
            '<input type="text" id="' + p + '_rec_other" placeholder="ชื่อ-นามสกุลผู้บันทึก">' +
            '<div class="err" data-err="' + p + '_rec_other">กรุณาระบุชื่อผู้บันทึก</div>' +
          '</div>' +
          '<div class="field">' +
            '<label>ช่องลงลายมือชื่อ (สำหรับพิมพ์เอกสาร)</label>' +
            '<div class="sign-box" aria-hidden="true">' +
              '<div class="sign-space">เซ็นจริงเมื่อพิมพ์เอกสาร</div>' +
              '<div class="sign-line"></div>' +
              '<div class="sign-cap">ลงชื่อ .................................................<br>ผู้บันทึกข้อมูล</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
  }

  function showOther(m, focus) {
    var sel = recSel(m), other = recOther(m);
    var isOther = sel.value === STAFF_OTHER;
    other.parentNode.hidden = !isOther;
    if (isOther && focus) other.focus();
  }

  /* เติมตัวเลือกผู้บันทึก (คงค่าที่เลือกอยู่ไว้ ถ้ายังมีในรายชื่อ) */
  function buildStaffSelects(renameFrom, renameTo) {
    MODULES.forEach(function (m) {
      var sel = recSel(m);
      var cur = sel.value;
      if (renameFrom && cur === renameFrom) cur = renameTo;
      sel.textContent = "";
      var ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "-- เลือกผู้บันทึกข้อมูล --";
      sel.appendChild(ph);
      STAFF.forEach(function (name, i) {
        var o = document.createElement("option");
        o.value = name;
        o.textContent = (i + 1) + ". " + name;
        sel.appendChild(o);
      });
      var other = document.createElement("option");
      other.value = STAFF_OTHER;
      other.textContent = (STAFF.length + 1) + ". อื่น ๆ (ระบุชื่อ)";
      sel.appendChild(other);
      sel.value = (cur === STAFF_OTHER || STAFF.indexOf(cur) !== -1) ? cur : "";
      showOther(m, false);
    });
  }

  /* อ่านค่าผู้บันทึก: คืน null เมื่อยังไม่กรอกครบ */
  function readRecorder(m) {
    var sel = recSel(m), other = recOther(m);
    if (!sel.value) { setErr(sel.id, "กรุณาเลือกผู้บันทึกข้อมูล"); return null; }
    clearErr(sel.id);
    if (sel.value === STAFF_OTHER) {
      var txt = (other.value || "").trim();
      if (!txt) { setErr(other.id, "กรุณาระบุชื่อ-นามสกุลผู้บันทึก"); return null; }
      clearErr(other.id);
      return txt;
    }
    clearErr(other.id);
    return sel.value;
  }
  function fillRecorder(m, name) {
    var sel = recSel(m), other = recOther(m);
    if (!name) { sel.value = ""; other.value = ""; }
    else if (STAFF.indexOf(name) !== -1) { sel.value = name; other.value = ""; }
    else { sel.value = STAFF_OTHER; other.value = name; }
    showOther(m, false);
  }
  function resetRecorder(m) {
    var sel = recSel(m), other = recOther(m);
    sel.value = (lastRecorder && STAFF.indexOf(lastRecorder) !== -1) ? lastRecorder : "";
    other.value = "";
    clearErr(sel.id);
    clearErr(other.id);
    showOther(m, false);
  }
  function initRecorderFields() {
    buildRecorderBlocks();
    buildStaffSelects();
    MODULES.forEach(function (m) {
      var sel = recSel(m), other = recOther(m);
      sel.addEventListener("change", function () {
        if (sel.value && sel.value !== STAFF_OTHER) lastRecorder = sel.value;
        clearErr(sel.id);
        showOther(m, true);
      });
      other.addEventListener("input", function () { if (other.value.trim()) clearErr(other.id); });
    });
  }

  /* ---------- แผงจัดการรายชื่อผู้บันทึก ---------- */
  function saveStaff(renameFrom, renameTo) {
    store.set(STAFF_KEY, JSON.stringify(STAFF));
    if (renameFrom && lastRecorder === renameFrom) lastRecorder = renameTo;
    buildStaffSelects(renameFrom, renameTo);
    renderStaffList();
  }
  function staffButton(label, aria, cls, onClick, disabled) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "mini" + (cls ? " " + cls : "");
    b.textContent = label;
    b.setAttribute("aria-label", aria);
    b.disabled = !!disabled;
    b.addEventListener("click", onClick);
    return b;
  }
  function moveStaff(i, delta) {
    var j = i + delta;
    if (j < 0 || j >= STAFF.length) return;
    var t = STAFF[i]; STAFF[i] = STAFF[j]; STAFF[j] = t;
    saveStaff();
    var btns = $all("#staffList li")[j];
    if (btns) { var f = btns.querySelector(delta < 0 ? ".up" : ".down") || btns.querySelector("input"); if (f && !f.disabled) f.focus(); }
  }
  function renderStaffList() {
    var list = byId("staffList");
    list.textContent = "";
    STAFF.forEach(function (name, i) {
      var li = document.createElement("li");
      var no = document.createElement("span");
      no.className = "no";
      no.textContent = (i + 1) + ".";
      var input = document.createElement("input");
      input.type = "text";
      input.value = name;
      input.setAttribute("aria-label", "ชื่อผู้บันทึกลำดับที่ " + (i + 1));
      input.addEventListener("change", function () {
        var v = input.value.replace(/\s+/g, " ").trim();
        if (!v) { input.value = name; toast("ชื่อต้องไม่ว่าง หากต้องการเอาออกให้กด \"ลบ\"", "err"); return; }
        if (v === name) { input.value = v; return; }
        if (STAFF.indexOf(v) !== -1) { input.value = name; toast("มีชื่อนี้อยู่ในรายการแล้ว", "err"); return; }
        STAFF[i] = v;
        saveStaff(name, v);
        toast("แก้ไขชื่อแล้ว", "ok");
      });
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
      li.appendChild(no);
      li.appendChild(input);
      li.appendChild(staffButton("▲", "เลื่อนขึ้น", "up", function () { moveStaff(i, -1); }, i === 0));
      li.appendChild(staffButton("▼", "เลื่อนลง", "down", function () { moveStaff(i, 1); }, i === STAFF.length - 1));
      li.appendChild(staffButton("ลบ", "ลบ " + name, "del", function () {
        askConfirm("ลบ \"" + name + "\" ออกจากรายชื่อผู้บันทึกหรือไม่? (รายการที่บันทึกไว้แล้วยังคงชื่อเดิม)", "ลบรายชื่อ")
          .then(function (ok) {
            if (!ok) return;
            STAFF.splice(STAFF.indexOf(name), 1);
            saveStaff();
            toast("ลบรายชื่อแล้ว", "ok");
          });
      }));
      list.appendChild(li);
    });
    byId("staffCount").textContent = STAFF.length + " คน";
    byId("emptyStaff").hidden = STAFF.length > 0;
    list.hidden = STAFF.length === 0;
  }
  function initStaffPanel() {
    byId("formStaff").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = (byId("st_name").value || "").replace(/\s+/g, " ").trim();
      if (!v) { setErr("st_name", "กรุณาระบุชื่อ-นามสกุล"); byId("st_name").focus(); return; }
      if (STAFF.indexOf(v) !== -1) { setErr("st_name", "มีชื่อนี้อยู่ในรายการแล้ว"); byId("st_name").focus(); return; }
      clearErr("st_name");
      STAFF.push(v);
      saveStaff();
      byId("st_name").value = "";
      byId("st_name").focus();
      toast("เพิ่ม \"" + v + "\" แล้ว", "ok");
    });
    byId("st_name").addEventListener("input", function () { clearErr("st_name"); });
    byId("btnStaffDefault").addEventListener("click", function () {
      askConfirm("คืนค่ารายชื่อผู้บันทึกเป็นรายชื่อเริ่มต้น " + DEFAULT_STAFF.length + " คนหรือไม่? รายชื่อที่เพิ่มเองจะหายไป", "คืนค่า")
        .then(function (ok) {
          if (!ok) return;
          setStaff(DEFAULT_STAFF);
          saveStaff();
          toast("คืนค่ารายชื่อเริ่มต้นแล้ว", "ok");
        });
    });
  }

  /* ================================================================
     7) รายงาน / ส่งออก / นำเข้า
     ================================================================ */
  var reportPicks = {};
  var reportRangeFrom = "", reportRangeTo = "";

  function reportOpts() {
    var selected = MODULES.filter(function (k) { return reportPicks[k]; });
    return {
      from: reportRangeFrom,
      to: reportRangeTo,
      farm: byId("rp_farm").value.trim(),
      by: byId("rp_by").value.trim(),
      modules: selected.length ? selected : null,
      staff: STAFF.slice()
    };
  }
  function refreshReportSummary() {
    var opts = reportOpts();
    var data = BioReport.buildData(DB, opts);
    var picks = opts.modules || MODULES;
    var n = data.sections.reduce(function (s, x) { return s + x.rows.length; }, 0);
    byId("reportSummary").textContent = "เลือกข้อมูล " + picks.length + " หมวด - พบ " + n +
      " รายการ | ช่วง: " + (opts.from ? BioReport.thDateFull(opts.from) : "เริ่มต้น") +
      (opts.to ? " ถึง " + BioReport.thDateFull(opts.to) : " ถึงปัจจุบัน");
    return data;
  }
  function buildReportPicks() {
    var wrap = byId("reportPicks");
    wrap.textContent = "";
    BioReport.MODULES.forEach(function (m) {
      reportPicks[m.key] = reportPicks[m.key] !== false;
      var label = document.createElement("label");
      label.className = "pick";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = reportPicks[m.key];
      cb.addEventListener("change", function () {
        reportPicks[m.key] = cb.checked;
        refreshReportSummary();
      });
      var span = document.createElement("span");
      span.textContent = m.title;
      var cnt = document.createElement("span");
      cnt.className = "cnt";
      cnt.textContent = (DB[m.key] || []).length + " รายการ";
      label.appendChild(cb);
      label.appendChild(span);
      label.appendChild(cnt);
      wrap.appendChild(label);
    });
  }
  function setRange(from, to) {
    reportRangeFrom = from;
    reportRangeTo = to;
    setDateValue("rp_from", from);
    setDateValue("rp_to", to);
    refreshReportSummary();
  }
  function ensureData() {
    var data = refreshReportSummary();
    if (!reportOpts().modules) { toast("กรุณาเลือกหมวดข้อมูลอย่างน้อย 1 หมวด", "err"); return null; }
    if (data.total === 0) { toast("ไม่มีข้อมูลในช่วงที่เลือก", "err"); return null; }
    return data;
  }
  function exportButton(id, fn, label) {
    byId(id).addEventListener("click", function () {
      var data = ensureData();
      if (!data) return;
      try { fn(data); toast("สร้างไฟล์ " + label + " แล้ว", "ok"); }
      catch (e) { console.error(e); toast("สร้างไฟล์ " + label + " ไม่สำเร็จ", "err"); }
    });
  }
  function openPrint(okMsg) {
    var ok = BioReport.openPrintWindow(refreshReportSummary(), true);
    if (!ok) toast("ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต pop-up แล้วเลือก Save as PDF", "err");
    else if (okMsg) toast(okMsg, "ok");
  }

  function initReport() {
    $all("[data-range]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = b.getAttribute("data-range");
        if (r === "all") setRange("", "");
        else if (r === "month") setRange(todayISO().slice(0, 8) + "01", todayISO());
        else setRange(daysAgoISO(parseInt(r, 10) - 1), todayISO());
      });
    });
    byId("rp_from").addEventListener("change", function () { reportRangeFrom = this.value; refreshReportSummary(); });
    byId("rp_to").addEventListener("change", function () { reportRangeTo = this.value; refreshReportSummary(); });
    byId("rp_farm").addEventListener("input", refreshReportSummary);
    byId("rp_by").addEventListener("input", refreshReportSummary);

    exportButton("btnExpWord", BioReport.buildDocx, "Word");
    exportButton("btnExpExcel", BioReport.buildXlsx, "Excel");
    exportButton("btnExpPpt", BioReport.buildPptx, "PowerPoint");
    byId("btnExpJson").addEventListener("click", function () {
      if (!ensureData()) return;
      try { toast("ส่งออก JSON แล้ว " + BioReport.exportJson(DB, reportOpts()) + " รายการ", "ok"); }
      catch (e) { console.error(e); toast("ส่งออก JSON ไม่สำเร็จ", "err"); }
    });
    byId("btnPreview").addEventListener("click", function () {
      var data = refreshReportSummary();
      byId("previewBox").innerHTML = BioReport.buildReportHTML(data);
      byId("previewBadge").textContent = data.total + " รายการ";
      toast("แสดงตัวอย่างรายงานแล้ว", "ok");
    });
    byId("btnPrintPreview").addEventListener("click", function () { openPrint(""); });
    byId("btnExpPdf").addEventListener("click", function () { openPrint("เปิดหน้าพิมพ์แล้ว เลือกปลายทาง \"Save as PDF\""); });
    initImport();
  }

  /* ---------- นำเข้า JSON ---------- */
  var pendingImport = null;
  function showImportInfo() {
    var info = byId("importInfo");
    if (!pendingImport) { info.textContent = "ยังไม่ได้เลือกไฟล์"; return; }
    var d = pendingImport.data;
    info.textContent = "ไฟล์: " + pendingImport.name + " (" + (pendingImport.size / 1024).toFixed(1) +
      " KB) - พบหมวดข้อมูล " + Object.keys(d.modules).length + " หมวด, " + d.total + " รายการ" +
      (d.staff && d.staff.length ? ", รายชื่อผู้บันทึก " + d.staff.length + " คน" : "") +
      (d.farm ? " - ฟาร์ม: " + d.farm : "");
  }
  function initImport() {
    var input = byId("importFile");
    input.addEventListener("change", function () {
      pendingImport = null;
      var f = this.files && this.files[0];
      if (!f) { showImportInfo(); return; }
      function done(text) {
        try {
          var parsed = BioReport.parseJsonFile(text);
          pendingImport = { name: f.name, size: f.size, data: parsed };
          showImportInfo();
          if (parsed.warnings.length) toast("นำเข้าได้บางส่วน: " + parsed.warnings.join("; "), "err");
          else toast("อ่านไฟล์ JSON สำเร็จ", "ok");
        } catch (e) {
          console.error(e);
          pendingImport = null;
          showImportInfo();
          toast("ไฟล์ JSON ไม่ถูกต้อง: " + e.message, "err");
        }
      }
      if (f.text) {                                   // เบราว์เซอร์มาตรฐาน
        f.text().then(done).catch(function () { toast("อ่านไฟล์ไม่สำเร็จ", "err"); });
      } else if (typeof FileReader !== "undefined") { // Safari รุ่นเก่า / WebView
        var reader = new FileReader();
        reader.onload = function () { done(String(reader.result)); };
        reader.onerror = function () { toast("อ่านไฟล์ไม่สำเร็จ", "err"); };
        try { reader.readAsText(f, "utf-8"); }
        catch (e) { toast("เบราว์เซอร์นี้ไม่รองรับการอ่านไฟล์ กรุณาใช้ Chrome/Safari รุ่นใหม่", "err"); }
      } else {
        toast("เบราว์เซอร์นี้ไม่รองรับการนำเข้าไฟล์", "err");
      }
    });

    byId("btnImport").addEventListener("click", function () {
      if (!pendingImport) { toast("กรุณาเลือกไฟล์ .json ก่อน", "err"); return; }
      var mode = byId("importMode").value;
      var actionText = mode === "replace" ? "แทนที่ข้อมูลเดิมทั้งหมด" : "รวมข้อมูลกับข้อมูลเดิม";
      askConfirm("ต้องการนำเข้าข้อมูลโดยการ" + actionText + "หรือไม่? (" + pendingImport.data.total + " รายการ)", "นำเข้าข้อมูล")
        .then(function (ok) {
          if (!ok) return;
          MODULES.forEach(function (m) { if (editing[m]) formOf(m).reset(); });
          var d = pendingImport.data;
          var r = BioReport.mergeImport(DB, d, mode);
          if (!saveAll(DB)) return;
          // รายชื่อผู้บันทึกในไฟล์: แทนที่ (โหมดแทนที่) หรือเพิ่มชื่อที่ยังไม่มี (โหมดรวม)
          if (d.staff && d.staff.length) {
            setStaff(mode === "replace" ? d.staff : STAFF.concat(d.staff));
            saveStaff();
          }
          renderAll();
          buildReportPicks();
          refreshReportSummary();
          pendingImport = null;
          input.value = "";
          showImportInfo();
          toast("นำเข้าสำเร็จ: เพิ่ม " + r.added + " รายการ, ซ้ำ " + r.skipped + ", แทนที่ " + r.replaced, "ok");
        });
    });
  }

  /* ================================================================
     8) ช่องวันที่/เวลาสำรอง (เบราว์เซอร์ที่ไม่รู้จัก input date/time เช่น iOS Safari รุ่นเก่า)
     ================================================================ */
  function thaiDigits(s) {
    return String(s || "").replace(/[๐-๙]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x0E50 + 48); });
  }
  function isoToThai(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
    var p = iso.split("-");
    return String(parseInt(p[2], 10)) + "/" + p[1] + "/" + (parseInt(p[0], 10) + 543);
  }
  function thaiToISO(txt) {
    var m = thaiDigits(txt).match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!m) return null;
    var y = parseInt(m[3], 10);
    if (y < 100) y += 2500;
    if (y > 2400) y -= 543;
    var d = parseInt(m[1], 10), mo = parseInt(m[2], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return y + "-" + pad2(mo) + "-" + pad2(d);
  }
  /* ช่องเดิม (el) ถูกซ่อนและเก็บค่า YYYY-MM-DD ให้โค้ดส่วนอื่นอ่านเหมือนเดิม
     ผู้ใช้พิมพ์วันที่แบบ พ.ศ. ในช่องข้อความที่สร้างขึ้นใหม่ */
  function upgradeDateInput(el) {
    if (!el || el.dataset.upgraded) return;
    el.dataset.upgraded = "1";
    el.type = "text";
    el.removeAttribute("min");
    el.removeAttribute("max");
    var picker = document.createElement("input");
    picker.type = "text";
    picker.className = "dt-a";
    picker.setAttribute("inputmode", "numeric");
    picker.setAttribute("autocomplete", "off");
    picker.setAttribute("maxlength", "10");
    picker.placeholder = "วว/ดด/ปปปป เช่น 11/11/2569";
    if (el.id) {
      picker.id = el.id + "_txt";
      var lab = document.querySelector('label[for="' + el.id + '"]');
      if (lab) lab.htmlFor = picker.id;
    }
    var wrap = document.createElement("div");
    wrap.className = "dt-fallback";
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(picker);
    el.value = "";
    function commit(final) {
      var t = picker.value.trim();
      if (!t) { el.value = ""; picker.classList.remove("bad"); if (final) fire(el, "change"); return; }
      var iso = thaiToISO(t);
      if (!iso) {
        el.value = "";
        if (final) picker.classList.add("bad");
        return;
      }
      picker.classList.remove("bad");
      el.value = iso;
      if (final) { picker.value = isoToThai(iso); fire(el, "change"); }
    }
    picker.addEventListener("input", function () { commit(false); });
    picker.addEventListener("blur", function () { commit(true); });
    el.style.display = "none";
    el._setISO = function (iso) {           // ให้ setDateValue อัปเดตช่องที่ผู้ใช้เห็นได้
      el.value = iso || "";
      picker.value = isoToThai(iso);
      picker.classList.remove("bad");
    };
    el._dtPicker = picker;                  // ให้ clearErr/setErr รู้จักช่องวันที่ทดแทน
  }
  function upgradeTimeInput(el) {
    if (!el || el.dataset.upgraded) return;
    el.dataset.upgraded = "1";
    el.type = "text";
    el.setAttribute("inputmode", "numeric");
    el.setAttribute("placeholder", "ชม:นน");
    el.setAttribute("maxlength", "5");
    function normalise(final) {
      var v = thaiDigits(el.value).replace(".", ":").replace(/[^0-9:]/g, "");
      if (!v) { el.value = ""; return; }
      var digits = v.replace(/[^0-9]/g, "");
      if (digits.length === 4) v = digits.slice(0, 2) + ":" + digits.slice(2);
      else if (digits.length === 3) v = digits.slice(0, 1) + ":" + digits.slice(1);
      var m = v.match(/^(\d{1,2}):(\d{2})$/);
      if (m && parseInt(m[1], 10) < 24 && parseInt(m[2], 10) < 60) el.value = pad2(parseInt(m[1], 10)) + ":" + m[2];
      else if (final) el.value = digits;
    }
    el.addEventListener("input", function () { normalise(false); });
    el.addEventListener("blur", function () { normalise(true); });
  }
  function setDateValue(id, iso) {
    var el = byId(id);
    if (!el) return;
    el.value = iso;
    if (el._setISO) el._setISO(iso);
  }

  /* ================================================================
     9) init
     ================================================================ */
  byId("todayChip").textContent = longThaiToday();
  if (document.documentElement.className.indexOf("picker-fallback") !== -1) {
    $all('input[type="date"]').forEach(upgradeDateInput);
    $all('input[type="time"]').forEach(upgradeTimeInput);
  }
  initRecorderFields();
  initStaffPanel();
  initFilters();
  initForms();
  initReport();
  MODULES.forEach(applyDefaults);
  renderAll();
  buildReportPicks();
  refreshReportSummary();
})();
