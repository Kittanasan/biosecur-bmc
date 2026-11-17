/* ==================================================================
   ซิงก์ข้อมูลกับที่เก็บข้อมูลกลาง (Google Sheets ผ่าน Google Apps Script)
   - แอปบันทึกในเครื่องก่อนเสมอ (ใช้ออฟไลน์ได้) แล้วซิงก์เมื่อมีอินเทอร์เน็ต
   - ไม่มีรหัสทีม: ดึงข้อมูลมาดูได้อย่างเดียว | มีรหัสทีม: ส่งข้อมูลขึ้น + ดึงข้อมูลของคนอื่นมา
   - ถ้าแก้รายการเดียวกันหลายเครื่อง ใช้ "แก้ไขล่าสุดชนะ" (updatedAt)
   - ตั้งค่า URL ได้ที่ js/config.js (ให้ทุกคนใช้ร่วมกัน) หรือที่ปุ่ม "ข้อมูลกลาง" ในแอป (เฉพาะเครื่องนั้น)
   ================================================================== */
(function () {
  "use strict";
  var A = window.BioApp;
  if (!A) return;
  var CFG = window.BIO_CONFIG || {};

  var K_URL = "biosecurity-sync-url", K_KEY = "biosecurity-sync-key", K_SHEET = "biosecurity-sync-sheet";
  var K_CURSOR = "biosecurity-sync-cursor", K_PUSHED = "biosecurity-sync-pushed", K_LAST = "biosecurity-sync-last";
  var CHUNK = 150;           // จำนวนรายการต่อการส่ง 1 ครั้ง
  var AUTO_MS = 120000;      // ดึงข้อมูลอัตโนมัติทุก 2 นาที (เมื่อเปิดหน้าอยู่)

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  function $(id) { return document.getElementById(id); }

  function syncUrl() { return (lsGet(K_URL) || CFG.syncUrl || "").trim(); }
  function syncKey() { return (lsGet(K_KEY) || "").trim(); }
  function sheetUrl() { return (lsGet(K_SHEET) || CFG.sheetUrl || "").trim(); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function validUrl(u) { return /^https:\/\/script\.google(usercontent)?\.com\/\S+$/.test(u); }

  /* ---------- สถานะ ---------- */
  var busy = false, again = false, timer = null, state = { kind: "off", text: "" };
  function pendingCount() {
    var db = A.getDB(), tomb = A.getTomb(), pushed = num(lsGet(K_PUSHED)), n = 0;
    A.MODULES.forEach(function (m) {
      db[m].forEach(function (r) { if (!r.updatedAt || r.updatedAt > pushed) n++; });
      var t = tomb[m] || {};
      Object.keys(t).forEach(function (id) { if (t[id] > pushed) n++; });
    });
    return n;
  }
  function timeText(ts) {
    if (!ts) return "-";
    var d = new Date(ts), p = function (x) { return (x < 10 ? "0" : "") + x; };
    return A.thDate(d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function setState(kind, text) {
    state = { kind: kind, text: text };
    var chip = $("syncChipText");
    if (chip) chip.textContent = text;
    var btn = $("btnSyncChip");
    if (btn) btn.setAttribute("data-state", kind);
    var st = $("syncStatus");
    if (st) { st.textContent = text; st.setAttribute("data-state", kind); }
    var pend = $("syncPending");
    if (pend) pend.textContent = pendingCount() + " รายการ";
    var last = $("syncLast");
    if (last) last.textContent = timeText(num(lsGet(K_LAST)));
  }
  function idleState() {
    if (!syncUrl()) return setState("off", "ข้อมูลกลาง: ยังไม่ตั้งค่า");
    if (!syncKey()) return setState("readonly", "ข้อมูลกลาง: ดูอย่างเดียว");
    var p = pendingCount();
    if (typeof navigator !== "undefined" && navigator.onLine === false) return setState("offline", "ออฟไลน์ (รอซิงก์ " + p + " รายการ)");
    var last = num(lsGet(K_LAST));
    setState(p ? "pending" : "ok", p ? "รอซิงก์ " + p + " รายการ" : (last ? "ซิงก์แล้ว " + timeText(last) : "พร้อมซิงก์"));
  }

  /* ---------- เครือข่าย ---------- */
  function post(payload) {
    return fetch(syncUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },   // แบบ "คำขอธรรมดา" ไม่ต้อง preflight (Apps Script ไม่รองรับ OPTIONS)
      body: JSON.stringify(payload)
    }).then(parse);
  }
  function get(query) {
    return fetch(syncUrl() + (syncUrl().indexOf("?") === -1 ? "?" : "&") + query).then(parse);
  }
  function parse(res) {
    if (!res.ok) throw new Error("เซิร์ฟเวอร์ตอบกลับผิดปกติ (" + res.status + ")");
    return res.text().then(function (t) {
      try { return JSON.parse(t); }
      catch (e) { throw new Error("ลิงก์ไม่ใช่ที่เก็บข้อมูลของระบบนี้ (ตรวจว่าเป็นลิงก์ที่ลงท้าย /exec และตั้งสิทธิ์เป็น Anyone)"); }
    });
  }
  function errText(e) {
    var m = e && e.message ? e.message : String(e);
    if (m === "bad_key") return "รหัสทีมไม่ถูกต้อง";
    if (m === "not_configured") return "ยังไม่ได้ตั้งรหัสทีมใน Google Apps Script (ดู SETUP-GOOGLE-SHEETS.md)";
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return "เชื่อมต่อไม่ได้ (ไม่มีอินเทอร์เน็ต หรือลิงก์ไม่ถูกต้อง)";
    return m;
  }

  /* ---------- สร้างข้อมูลที่จะส่ง ---------- */
  function schemaOf(m) {
    var mod = null;
    window.BioReport.MODULES.forEach(function (x) { if (x.key === m) mod = x; });
    var cols = [];
    if (mod) mod.cols.forEach(function (c) {
      if (c.calc) return;                                   // คอลัมน์คำนวณ (รวมอาหาร ฯลฯ) ไม่ต้องเก็บ
      cols.push([c.k, c.t, /^num/.test(c.type || "") ? "num" : "text"]);
    });
    return { title: mod ? mod.title : m, columns: cols };
  }
  function collectItems() {
    var db = A.getDB(), tomb = A.getTomb(), pushed = num(lsGet(K_PUSHED)), now = Date.now(), items = [], stamped = false;
    A.MODULES.forEach(function (m) {
      db[m].forEach(function (r) {
        if (!r.updatedAt) { r.updatedAt = now; stamped = true; }   // ข้อมูลเก่าที่ยังไม่มีเวลาแก้ไข
        if (r.updatedAt > pushed) items.push({ m: m, rec: r });
      });
      var t = tomb[m] || {};
      Object.keys(t).forEach(function (id) {
        if (t[id] > pushed) items.push({ m: m, rec: { id: id, updatedAt: t[id], deleted: true } });
      });
    });
    if (stamped) A.saveData();
    return items;
  }
  function chunkPayloads(items) {
    var out = [];
    for (var i = 0; i < items.length; i += CHUNK) {
      var mods = {};
      items.slice(i, i + CHUNK).forEach(function (it) {
        if (!mods[it.m]) { var s = schemaOf(it.m); mods[it.m] = { title: s.title, columns: s.columns, records: [] }; }
        mods[it.m].records.push(it.rec);
      });
      out.push(mods);
    }
    return out;
  }

  /* ---------- รวมข้อมูลที่ดึงมาเข้าเครื่อง ---------- */
  function mergeRemote(records) {
    var db = A.getDB(), tomb = A.getTomb(), stat = { added: 0, updated: 0, removed: 0 };
    Object.keys(records || {}).forEach(function (m) {
      if (A.MODULES.indexOf(m) === -1) return;
      records[m].forEach(function (rem) {
        if (!rem || !rem.id) return;
        var idx = -1;
        for (var i = 0; i < db[m].length; i++) if (db[m][i].id === rem.id) { idx = i; break; }
        var local = idx === -1 ? null : db[m][idx];
        var remTs = num(rem.updatedAt);
        if (rem.deleted) {
          if (local && remTs >= num(local.updatedAt)) { db[m].splice(idx, 1); stat.removed++; }
          return;
        }
        var myDel = tomb[m] && tomb[m][rem.id];
        if (myDel && myDel > remTs) return;                  // เราลบรายการนี้หลังจากที่ถูกแก้ล่าสุด -> การลบจะถูกส่งขึ้นไปเอง
        if (!local || remTs > num(local.updatedAt)) {
          var clean = {};
          Object.keys(rem).forEach(function (k) {
            if (k === "syncedAt" || k === "deleted") return;
            clean[k] = rem[k];
          });
          clean.updatedAt = remTs;
          if (local) { db[m][idx] = clean; stat.updated++; } else { db[m].push(clean); stat.added++; }
          if (myDel) { delete tomb[m][rem.id]; }
        }
      });
    });
    return stat;
  }

  /* ---------- ซิงก์ ---------- */
  function finishPull(res, startTs, pushedOk) {
    var stat = mergeRemote(res.records);
    if (stat.added || stat.updated || stat.removed) { A.saveData(); A.render(); }
    if (pushedOk) lsSet(K_PUSHED, String(startTs));
    if (res.cursor !== undefined && res.cursor !== null) lsSet(K_CURSOR, String(res.cursor));
    lsSet(K_LAST, String(Date.now()));
    A.saveTomb();
    return stat;
  }
  function run(manual) {
    if (!syncUrl()) { idleState(); return Promise.resolve(); }
    if (!validUrl(syncUrl())) { setState("error", "ลิงก์ที่เก็บข้อมูลไม่ถูกต้อง"); return Promise.resolve(); }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { idleState(); return Promise.resolve(); }
    if (busy) { again = true; return Promise.resolve(); }
    busy = true;
    setState("syncing", "กำลังซิงก์…");
    var startTs = Date.now(), cursor = num(lsGet(K_CURSOR)), flow;

    if (syncKey()) {
      var chunks = chunkPayloads(collectItems());
      var chain = Promise.resolve(null);
      if (!chunks.length) {
        chain = chain.then(function () { return post({ action: "push", key: syncKey(), since: cursor, modules: {} }); });
      } else {
        chunks.forEach(function (mods, i) {
          var last = i === chunks.length - 1;
          chain = chain.then(function () {
            return post({ action: "push", key: syncKey(), since: last ? cursor : -1, modules: mods }).then(function (r) {
              if (!r.ok) throw new Error(r.error || "ส่งข้อมูลไม่สำเร็จ");
              return r;
            });
          });
        });
      }
      flow = chain.then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || "ซิงก์ไม่สำเร็จ");
        return finishPull(res, startTs, true);
      });
    } else {
      flow = get("action=pull&since=" + cursor).then(function (res) {
        if (!res.ok) throw new Error(res.error || "ดึงข้อมูลไม่สำเร็จ");
        return finishPull(res, startTs, false);
      });
    }

    return flow.then(function (stat) {
      busy = false;
      idleState();
      if (manual) {
        var parts = [];
        if (stat.added) parts.push("เพิ่ม " + stat.added);
        if (stat.updated) parts.push("อัปเดต " + stat.updated);
        if (stat.removed) parts.push("ลบ " + stat.removed);
        A.toast("ซิงก์สำเร็จ" + (parts.length ? " (ดึงมา: " + parts.join(", ") + " รายการ)" : " ข้อมูลเป็นปัจจุบันแล้ว"), "ok");
      }
      if (again) { again = false; schedule(); }
    }).catch(function (e) {
      busy = false;
      var msg = errText(e);
      setState("error", "ซิงก์ไม่สำเร็จ: " + msg);
      if (manual) A.toast("ซิงก์ไม่สำเร็จ: " + msg, "err");
      if (again) { again = false; }
    });
  }
  function schedule() {
    if (!syncUrl() || !syncKey()) { idleState(); return; }
    clearTimeout(timer);
    idleState();
    timer = setTimeout(function () { run(false); }, 1500);
  }

  /* ---------- หน้าตั้งค่า ---------- */
  function refreshUI() {
    if ($("sync_url")) $("sync_url").value = lsGet(K_URL) || CFG.syncUrl || "";
    if ($("sync_key")) $("sync_key").value = lsGet(K_KEY) || "";
    if ($("sync_sheet")) $("sync_sheet").value = lsGet(K_SHEET) || CFG.sheetUrl || "";
    var open = $("btnSyncOpenSheet");
    if (open) { var s = sheetUrl(); open.hidden = !s; if (s) open.setAttribute("href", s); }
    var mode = $("syncMode");
    if (mode) mode.textContent = !syncUrl() ? "ยังไม่ได้ตั้งค่า" : (syncKey() ? "ซิงก์สองทาง (บันทึกและดึงข้อมูลได้)" : "ดูอย่างเดียว (ดึงข้อมูลมาดู ยังบันทึกขึ้นกลางไม่ได้)");
    idleState();
  }
  function initUI() {
    var form = $("formSync");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var url = ($("sync_url").value || "").trim();
      var key = ($("sync_key").value || "").trim();
      var sheet = ($("sync_sheet").value || "").trim();
      if (url && !validUrl(url)) {
        var box = document.querySelector('.err[data-err="sync_url"]');
        if (box) box.classList.add("show");
        $("sync_url").classList.add("bad");
        $("sync_url").focus();
        return;
      }
      var box2 = document.querySelector('.err[data-err="sync_url"]');
      if (box2) box2.classList.remove("show");
      $("sync_url").classList.remove("bad");
      if (url) lsSet(K_URL, url); else lsDel(K_URL);
      if (key) lsSet(K_KEY, key); else lsDel(K_KEY);
      if (sheet) lsSet(K_SHEET, sheet); else lsDel(K_SHEET);
      refreshUI();
      if (url) { A.toast("บันทึกการตั้งค่าแล้ว กำลังซิงก์…", "ok"); run(true); }
      else A.toast("ล้างการตั้งค่าที่เก็บข้อมูลกลางแล้ว", "ok");
    });
    $("btnSyncNow").addEventListener("click", function () {
      if (!syncUrl()) { A.toast("ยังไม่ได้ตั้งค่าลิงก์ที่เก็บข้อมูลกลาง", "err"); return; }
      run(true);
    });
    $("btnSyncReset").addEventListener("click", function () {
      lsDel(K_CURSOR); lsDel(K_PUSHED);
      A.toast("จะดึงและส่งข้อมูลทั้งหมดใหม่ในการซิงก์ครั้งถัดไป", "ok");
      if (syncUrl()) run(true);
    });
  }

  /* ---------- เริ่มทำงาน ---------- */
  initUI();
  idleState();
  window.addEventListener("online", function () { run(false); });
  window.addEventListener("offline", idleState);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) run(false); });
  setInterval(function () { if (!document.hidden) run(false); }, AUTO_MS);
  if (syncUrl()) setTimeout(function () { run(false); }, 800);

  window.BioSync = { schedule: schedule, run: run, refreshUI: refreshUI, mergeRemote: mergeRemote };
})();
