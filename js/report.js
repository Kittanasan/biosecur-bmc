/* ============================================================
   รายงานผล / ส่งออก-นำเข้าข้อมูล  (Word, PDF, Excel, PowerPoint, JSON)
   ศูนย์วิจัยและพัฒนาการเพาะเลี้ยงสัตว์น้ำชายฝั่งฉะเชิงเทรา
   ทำงานแบบออฟไลน์ 100% ไม่ต้องติดตั้งไลบรารีเพิ่ม
   ============================================================ */
window.BioReport = (function () {
  "use strict";

  /* ------------------------------------------------------------
     0) shim สำหรับทุกแพลตฟอร์ม (iOS 12/13, Firefox รุ่นเก่า, WebView บน Android)
     ------------------------------------------------------------ */
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (len, pad) {
      var s = String(this);
      pad = pad === undefined ? " " : String(pad);
      while (s.length < len) s = pad + s;
      return s.length > len ? s.slice(-len) : s;
    };
  }
  if (typeof Object.assign !== "function") {
    Object.assign = function (t) {
      for (var i = 1; i < arguments.length; i++) {
        var s = arguments[i];
        if (!s) continue;
        for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
      }
      return t;
    };
  }

  /* ------------------------------------------------------------
     1) นิยามหมวดข้อมูล + คอลัมน์
     ------------------------------------------------------------ */
  var M = [
    { key: "access", title: "ควบคุมการเข้าออกบุคลากร/ผู้เยี่ยมชม", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "timeIn", t: "เวลาเข้า", w: 9 },
      { k: "timeOut", t: "เวลาออก", w: 9 },
      { k: "type", t: "ประเภทบุคคล", w: 12 },
      { k: "fullName", t: "ชื่อ-นามสกุล", w: 20 },
      { k: "organization", t: "หน่วยงาน", w: 24 },
      { k: "objective", t: "วัตถุประสงค์", w: 20 },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "feed", title: "การให้อาหารและอุณหภูมิน้ำ", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "pond", t: "บ่อ", w: 9 },
      { k: "age", t: "อายุ(วัน)", w: 9, type: "num" },
      { k: "feed0830", t: "อาหาร 08.30 (กก.)", w: 12, type: "num2" },
      { k: "feed1200", t: "อาหาร 12.00 (กก.)", w: 12, type: "num2" },
      { k: "feed1600", t: "อาหาร 16.00 (กก.)", w: 12, type: "num2" },
      { k: "feed2000", t: "อาหาร 20.00 (กก.)", w: 12, type: "num2" },
      { k: "total", t: "รวมอาหาร (กก.)", w: 12, type: "num2", calc: "feedTotal" },
      { k: "temp0830", t: "อุณหภูมิ 08.30 (°C)", w: 12, type: "num1" },
      { k: "temp1500", t: "อุณหภูมิ 15.00 (°C)", w: 12, type: "num1" },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "health", title: "สุขภาพสัตว์น้ำ", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "pond", t: "บ่อ", w: 9 },
      { k: "gut0830", t: "ลำไส้ 08.30", w: 11 },
      { k: "white0830", t: "ขาว่ายน้ำ 08.30", w: 12 },
      { k: "dead0830", t: "ตัวตาย 08.30", w: 11, type: "num" },
      { k: "gut1600", t: "ลำไส้ 16.00", w: 11 },
      { k: "white1600", t: "ขาว่ายน้ำ 16.00", w: 12 },
      { k: "dead1600", t: "ตัวตาย 16.00", w: 11, type: "num" },
      { k: "deadTotal", t: "ตัวตายรวม", w: 10, type: "num", calc: "deadTotal" },
      { k: "feedManagement", t: "การจัดการอาหาร", w: 20 },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "water", title: "คุณภาพน้ำ", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "time", t: "เวลา", w: 8 },
      { k: "pond", t: "บ่อ", w: 9 },
      { k: "ammonia", t: "แอมโมเนีย (mg/L)", w: 12, type: "num3" },
      { k: "nitrite", t: "ไนไตรท์ (mg/L)", w: 12, type: "num3" },
      { k: "dox", t: "DO (mg/L)", w: 10, type: "num2" },
      { k: "ph", t: "pH", w: 8, type: "num2" },
      { k: "magnesium", t: "แม็กนีเซียม (mg/L)", w: 12, type: "num2" },
      { k: "calcium", t: "แคลเซียม (mg/L)", w: 12, type: "num2" },
      { k: "salinity", t: "ความเค็ม (ppt)", w: 11, type: "num1" },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "matwater", title: "วัสดุที่ใช้ในการเตรียมน้ำ", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "pond", t: "บ่อ", w: 9 },
      { k: "chem", t: "ชนิดสารเคมี", w: 16 },
      { k: "brand", t: "ยี่ห้อ", w: 14 },
      { k: "company", t: "บริษัท", w: 18 },
      { k: "reg", t: "เลขทะเบียนทางการค้า", w: 16 },
      { k: "qty", t: "ปริมาณ (กก./บ่อ)", w: 12, type: "num2" },
      { k: "volume", t: "ขนาดบ่อ/น้ำ (ตัน)", w: 13, type: "num2" },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "footbath", title: "วัสดุที่ใช้ในการเตรียมอ่างย่ำเท้า", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "chem", t: "ชนิดสารเคมี", w: 16 },
      { k: "brand", t: "ยี่ห้อ/บริษัท", w: 18 },
      { k: "reg", t: "เลขทะเบียนทางการค้า", w: 16 },
      { k: "qty", t: "ปริมาณ (กรัม)", w: 12, type: "num2" },
      { k: "size", t: "ขนาดอ่าง (ลิตร)", w: 12, type: "num2" },
      { k: "place", t: "ตำแหน่งอ่าง", w: 18 },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "equipment", title: "วัสดุที่ใช้ในการล้างอุปกรณ์", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "chem", t: "ชนิดสารเคมี", w: 16 },
      { k: "brand", t: "ยี่ห้อ/บริษัท", w: 18 },
      { k: "reg", t: "เลขทะเบียนทางการค้า", w: 16 },
      { k: "qty", t: "ปริมาณ (กรัม)", w: 12, type: "num2" },
      { k: "pond", t: "ขนาดบ่อ", w: 14 },
      { k: "item", t: "อุปกรณ์ที่ล้าง", w: 16 },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "watersource", title: "แหล่งน้ำใช้", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "source", t: "แหล่งน้ำ", w: 14 },
      { k: "pond", t: "บ่อที่ใช้", w: 12 },
      { k: "qty", t: "ปริมาณ (ตัน)", w: 11, type: "num2" },
      { k: "salinity", t: "ความเค็ม (ppt)", w: 11, type: "num1" },
      { k: "ph", t: "pH", w: 8, type: "num2" },
      { k: "treatment", t: "การบำบัด", w: 16 },
      { k: "result", t: "ผลตรวจ", w: 11 },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 18 }
    ]},
    { key: "move", title: "การเคลื่อนย้ายสัตว์น้ำ", cols: [
      { k: "date", t: "วันที่", w: 12, type: "date" },
      { k: "type", t: "ประเภท", w: 14 },
      { k: "from", t: "ต้นทาง", w: 14 },
      { k: "to", t: "ปลายทาง", w: 14 },
      { k: "species", t: "ชนิดสัตว์น้ำ", w: 16 },
      { k: "count", t: "จำนวน (ตัว)", w: 11, type: "num" },
      { k: "weight", t: "น้ำหนัก (กก.)", w: 11, type: "num2" },
      { k: "method", t: "วิธีขนย้าย", w: 14 },
      { k: "sender", t: "ผู้ส่ง", w: 14 },
      { k: "receiver", t: "ผู้รับ", w: 14 },
      { k: "doc", t: "เอกสาร", w: 12 },
      { k: "recorder", t: "ผู้บันทึกข้อมูล", w: 18 },
      { k: "note", t: "หมายเหตุ", w: 16 }
    ]}
  ];

  var TH_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                   "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

  /* ------------------------------------------------------------
     2) ตัวช่วยทั่วไป
     ------------------------------------------------------------ */
  function pad(n) { return String(n).padStart(2, "0"); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function has(v) { return !(v === "" || v === null || v === undefined); }
  function thDateFull(iso) {
    if (!iso) return "-";
    var p = String(iso).split("-");
    if (p.length !== 3) return String(iso);
    return parseInt(p[2], 10) + " " + (TH_MONTHS[parseInt(p[1], 10) - 1] || p[1]) + " " + (parseInt(p[0], 10) + 543);
  }
  function thDateShort(iso) {
    if (!iso) return "-";
    var p = String(iso).split("-");
    if (p.length !== 3) return String(iso);
    return parseInt(p[2], 10) + "/" + pad(parseInt(p[1], 10)) + "/" + (parseInt(p[0], 10) + 543);
  }
  function thNow() {
    var d = new Date();
    return d.getDate() + " " + TH_MONTHS[d.getMonth()] + " " + (d.getFullYear() + 543) +
      " เวลา " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + " น.";
  }
  function fileStamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }
  function cellText(row, col) {
    var v;
    if (col.calc === "feedTotal") {
      v = num(row.feed0830) + num(row.feed1200) + num(row.feed1600) + num(row.feed2000);
    } else if (col.calc === "deadTotal") {
      v = num(row.dead0830) + num(row.dead1600);
    } else {
      v = row[col.k];
    }
    if (col.type === "date") return thDateShort(v);
    if (col.type === "num") return has(v) ? String(num(v)) : "-";
    if (col.type === "num1") return has(v) ? num(v).toFixed(1) : "-";
    if (col.type === "num2") return has(v) ? num(v).toFixed(2) : "-";
    if (col.type === "num3") return has(v) ? num(v).toFixed(3) : "-";
    if (!has(v)) return "-";
    return String(v);
  }
  function sortRows(rows) {
    return rows.slice().sort(function (a, b) {
      var da = a.date || "", db = b.date || "";
      if (da !== db) return da < db ? 1 : -1;
      var pa = String(a.pond || a.from || a.chem || ""), pb = String(b.pond || b.from || b.chem || "");
      return pa.localeCompare(pb);
    });
  }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function escXml(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ------------------------------------------------------------
     3) ZIP writer (จำเป็นสำหรับ .docx / .xlsx / .pptx)
     ------------------------------------------------------------ */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256), c, i, k;
    for (i = 0; i < 256; i++) {
      c = i;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  var utf8enc = new TextEncoder();

  function zipBuild(files) {
    // files: [{name:'word/document.xml', data:'<xml ...>'}]
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nameBytes = utf8enc.encode(f.name);
      var dataBytes = utf8enc.encode(f.data);
      var crc = crc32(dataBytes);
      var local = new Uint8Array(30 + nameBytes.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);          // UTF-8 flag
      dv.setUint16(8, 0, true);               // stored
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0x21, true);           // date 1980-01-01
      dv.setUint32(14, crc, true);
      dv.setUint32(18, dataBytes.length, true);
      dv.setUint32(22, dataBytes.length, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      parts.push(local, dataBytes);

      var cen = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(cen.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x21, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, dataBytes.length, true);
      cv.setUint32(24, dataBytes.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cen.set(nameBytes, 46);
      central.push(cen);

      offset += local.length + dataBytes.length;
    });
    var cenSize = central.reduce(function (s, c) { return s + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cenSize, true);
    ev.setUint32(16, offset, true);
    var all = parts.concat(central, [end]);
    var total = all.reduce(function (s, p) { return s + p.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return new Blob([out], { type: "application/octet-stream" });
  }

  function download(blob, filename) {
    var nav = window.navigator || {};
    var ua = nav.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1) ||
                (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
    var isAndroid = /Android/i.test(ua);
    var isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|SamsungBrowser/i.test(ua);
    var isTouch = (nav.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
    var canShareFiles = !!(nav.canShare && typeof File === "function");
    var url = null;
    try { url = URL.createObjectURL(blob); } catch (e) { url = null; }

    // 1) หน้าต่างแชร์ไฟล์ของระบบ (iPhone/iPad และ Android): บันทึกเข้าแอป "ไฟล์" ได้
    //    - iOS ทุกเบราว์เซอร์: ต้องใช้เส้นทางนี้ (Safari ไม่รองรับ a[download] ข้ามไฟล์)
    //    - Android/iPadOS: ใช้เมื่อไฟล์ถูกสั่งแชร์ได้จริง ถ้าไม่ได้ให้ลงมาทางดาวน์โหลดปกติ
    if (url && canShareFiles) {
      var file = null;
      try { file = new File([blob], filename, { type: blob.type || "application/octet-stream" }); } catch (e2) { file = null; }
      if (file) {
        var can = false;
        try { can = !!nav.canShare({ files: [file] }); } catch (e3) { can = false; }
        // Safari เดสก์ท็อป/iPad ที่มี canShare จะได้หน้าต่างแชร์เหมือนกัน ซึ่งบันทึกไฟล์ได้ง่ายกว่าดาวน์โหลด
        if (can && (isIOS || isAndroid || isSafari || isTouch)) {
          nav.share({ files: [file], title: filename }).then(function () {
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
          }).catch(function (err) {
            // ผู้ใช้กดยกเลิก = ไม่ต้องดาวน์โหลดซ้ำ ; กรณีอื่นให้ใช้เส้นทางสำรอง
            if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) {
              setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            } else {
              legacyDownload(url, filename);
            }
          });
          return;
        }
      }
    }

    // 2) วิธีมาตรฐาน (Windows, macOS, Linux, ChromeOS, Android, iPadOS)
    if (!url) {
      // เบราว์เซอร์ไม่รองรับ Blob URL (WebView รุ่นเก่า): ใช้ data URL แทน
      try {
        var reader = new FileReader();
        reader.onload = function () {
          var a = document.createElement("a");
          a.href = String(reader.result);
          a.download = filename;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
        };
        reader.readAsDataURL(blob);
      } catch (e4) {
        window.alert("เบราว์เซอร์นี้ไม่รองรับการดาวน์โหลดไฟล์ กรุณาเปิดด้วย Chrome หรือ Safari รุ่นใหม่");
      }
      return;
    }
    legacyDownload(url, filename);
  }

  function legacyDownload(url, filename) {
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.target = "_self";
    document.body.appendChild(a);
    try { a.click(); }
    catch (e) { window.open(url, "_blank"); }
    setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (e) {}
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 4000);
  }

  /* จัดชุดข้อมูลให้เอนจินสร้างไฟล์อ่านได้ง่ายบนเครื่องทุกแพลตฟอร์ม
     (เปิดใน MS Office / WPS / LibreOffice / Pages / Google Sheets / Numbers) */
  function inRange(r, from, to) {
    var d = r.date || "";
    if (from && d && d < from) return false;
    if (to && d && d > to) return false;
    return true;
  }
  function buildData(db, opts) {
    var from = opts.from || "", to = opts.to || "";
    var keys = opts.modules && opts.modules.length ? opts.modules : M.map(function (m) { return m.key; });
    var sections = M.filter(function (m) { return keys.indexOf(m.key) !== -1; }).map(function (m) {
      var rows = sortRows((db[m.key] || []).filter(function (r) { return inRange(r, from, to); }));
      return { key: m.key, title: m.title, cols: m.cols, rows: rows };
    });
    return {
      meta: {
        farm: opts.farm || "ศูนย์วิจัยและพัฒนาการเพาะเลี้ยงสัตว์น้ำชายฝั่ง",
        by: opts.by || "",
        from: from, to: to,
        created: thNow(),
        rangeText: (from ? "ตั้งแต่ " + thDateFull(from) : "ตั้งแต่เริ่มบันทึก") +
                   (to ? " ถึง " + thDateFull(to) : " ถึงปัจจุบัน")
      },
      sections: sections,
      total: sections.reduce(function (s, x) { return s + x.rows.length; }, 0)
    };
  }

  /* ------------------------------------------------------------
     5) Summary statistics (ใช้ในรายงานสรุป/สไลด์)
     ------------------------------------------------------------ */
  function summarize(data) {
    var out = [];
    data.sections.forEach(function (s) {
      out.push({ key: s.key, title: s.title, rows: s.rows.length, lines: sectionLines(s) });
    });
    return out;
  }
  function sectionLines(s) {
    var rows = s.rows, lines = [];
    function sum(field) { return rows.reduce(function (a, r) { return a + num(r[field]); }, 0); }
    function avg(field) {
      var v = rows.filter(function (r) { return has(r[field]); }).map(function (r) { return num(r[field]); });
      return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
    }
    var ponds = {};
    rows.forEach(function (r) { if (r.pond) ponds[r.pond] = 1; });
    var pondList = Object.keys(ponds).sort();
    if (pondList.length) lines.push("บ่อที่บันทึก: " + pondList.join(", "));
    if (s.key === "access") {
      lines.push("ผู้เข้าออกฟาร์มรวม " + rows.length + " ราย");
      var inside = rows.filter(function (r) { return !r.timeOut; }).length;
      if (inside) lines.push("ยังไม่บันทึกเวลาออก " + inside + " ราย");
    }
    if (s.key === "feed") {
      lines.push("ปริมาณอาหารรวม " + sum("feed0830").toFixed(2) + " + " + sum("feed1200").toFixed(2) + " + " +
                 sum("feed1600").toFixed(2) + " + " + sum("feed2000").toFixed(2) + " = " +
                 (sum("feed0830") + sum("feed1200") + sum("feed1600") + sum("feed2000")).toFixed(2) + " กก.");
      var t1 = avg("temp0830"), t2 = avg("temp1500");
      if (t1 !== null) lines.push("อุณหภูมิน้ำเฉลี่ย 08.30 น. " + t1.toFixed(1) + " °C");
      if (t2 !== null) lines.push("อุณหภูมิน้ำเฉลี่ย 15.00 น. " + t2.toFixed(1) + " °C");
    }
    if (s.key === "health") {
      lines.push("ตัวตายรวม " + (sum("dead0830") + sum("dead1600")) + " ตัว");
    }
    if (s.key === "water") {
      [["ammonia", "แอมโมเนีย", 3], ["nitrite", "ไนไตรท์", 3], ["dox", "DO", 2],
       ["ph", "pH", 2], ["magnesium", "แม็กนีเซียม", 2], ["calcium", "แคลเซียม", 2],
       ["salinity", "ความเค็ม", 1]].forEach(function (f) {
        var a = avg(f[0]);
        if (a !== null) lines.push(f[1] + " เฉลี่ย " + a.toFixed(f[2]));
      });
    }
    if (s.key === "matwater") lines.push("ปริมาณสารเคมีรวม " + sum("qty").toFixed(2) + " กก.");
    if (s.key === "footbath") lines.push("ปริมาณสารเคมีรวม " + sum("qty").toFixed(2) + " กรัม");
    if (s.key === "equipment") lines.push("ปริมาณสารเคมีรวม " + sum("qty").toFixed(2) + " กรัม");
    if (s.key === "watersource") {
      lines.push("ปริมาณน้ำใช้รวม " + sum("qty").toFixed(2) + " ตัน");
      var fail = rows.filter(function (r) { return r.result === "ไม่ผ่าน"; }).length;
      if (fail) lines.push("ผลตรวจไม่ผ่าน " + fail + " รายการ");
    }
    if (s.key === "move") {
      lines.push("จำนวนสัตว์น้ำเคลื่อนย้ายรวม " + sum("count") + " ตัว (" + sum("weight").toFixed(2) + " กก.)");
    }
    return lines;
  }

  /* ------------------------------------------------------------
     6) สร้าง HTML สำหรับตัวอย่างรายงาน + หน้าพิมพ์/PDF
     ------------------------------------------------------------ */
  function buildReportHTML(data) {
    var h = [];
    h.push('<div class="rp-doc" id="rpPrintDoc">');
    h.push('<h1 style="font-size:1.15rem">รายงานผลการบันทึกข้อมูลฟาร์มกุ้งตามระบบ Biosecurity</h1>');
    h.push('<div style="font-size:.85rem;color:#5b7280">' + esc(data.meta.farm) + '</div>');
    h.push('<table style="min-width:0;margin:12px 0;font-size:.84rem"><tbody>');
    h.push('<tr><th style="width:170px">ช่วงข้อมูล</th><td>' + esc(data.meta.rangeText) + '</td></tr>');
    h.push('<tr><th>จำนวนรายการ</th><td>' + data.total + ' รายการ</td></tr>');
    if (data.meta.by) h.push('<tr><th>ผู้จัดทำรายงาน</th><td>' + esc(data.meta.by) + '</td></tr>');
    h.push('<tr><th>สร้างเมื่อ</th><td>' + esc(data.meta.created) + '</td></tr>');
    h.push('</tbody></table>');

    h.push('<h2 style="font-size:1rem;margin:16px 0 8px">สรุปภาพรวม</h2>');
    h.push('<table><thead><tr><th>หมวดข้อมูล</th><th class="num">จำนวนรายการ</th><th>สรุปผล</th></tr></thead><tbody>');
    data.sections.forEach(function (s) {
      var lines = sectionLines(s);
      h.push('<tr><td>' + esc(s.title) + '</td><td class="num">' + s.rows.length + '</td><td>' +
        (lines.length ? esc(lines.join(" / ")) : "-") + '</td></tr>');
    });
    h.push('</tbody></table>');

    data.sections.forEach(function (s) {
      h.push('<h2 style="font-size:1rem;margin:18px 0 8px">' + esc(s.title) + ' (' + s.rows.length + ' รายการ)</h2>');
      if (!s.rows.length) { h.push('<div class="note-box">ไม่มีข้อมูลในช่วงที่เลือก</div>'); return; }
      h.push('<div class="preview-wrap" style="max-height:none"><table><thead><tr>');
      s.cols.forEach(function (c) { h.push('<th class="' + (c.type ? "num" : "") + '">' + esc(c.t) + '</th>'); });
      h.push('</tr></thead><tbody>');
      s.rows.forEach(function (r) {
        h.push('<tr>');
        s.cols.forEach(function (c) {
          h.push('<td class="' + (c.type ? "num" : "") + '">' + esc(cellText(r, c)) + '</td>');
        });
        h.push('</tr>');
      });
      h.push('</tbody></table></div>');
    });

    /* --- ช่องลงลายมือชื่อจริง (ใช้เมื่อพิมพ์เอกสารเดือนละ 1 ครั้ง) --- */
    h.push('<h2 style="font-size:1rem;margin:18px 0 8px">ลงลายมือชื่อ</h2>');
    h.push('<div style="display:flex;gap:24px;flex-wrap:wrap;margin:8px 0 4px">');
    [["ผู้จัดทำรายงาน", data.meta.by], ["ผู้ตรวจสอบ", ""], ["ผู้รับรอง", ""]].forEach(function (p) {
      h.push('<div style="flex:1 1 240px;text-align:center;font-size:.85rem">' +
        '<div style="height:56px"></div>' +
        '<div style="border-top:1px dashed #6b8492;margin:0 8px 4px"></div>' +
        '<div>ลงชื่อ ...................................................</div>' +
        '<div style="color:#5b7280">' + esc(p[0]) + (p[1] ? " (" + esc(p[1]) + ")" : "") + '</div>' +
        '</div>');
    });
    h.push('</div>');
    h.push('<div style="font-size:.8rem;color:#5b7280;margin-top:6px">วันที่ ......./......./.......</div>');
    h.push('</div>');
    return h.join("");
  }

  function openPrintWindow(data, autoPrint) {
    var nav = window.navigator || {};
    var ua = nav.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) ||
                (nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1) ||
                (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
    // Safari บน iPhone/iPad และ Chrome บน Android มักไม่เปิดหน้าต่างใหม่ = ใช้รายงานในหน้าเดิมเสมอ
    if (isIOS) return inlinePrint(data);
    var w = null;
    try { w = window.open("", "_blank"); } catch (e) { w = null; }
    var css =
      'body{font-family:"Sarabun","Noto Sans Thai","Leelawadee UI",Tahoma,sans-serif;color:#0f2b33;margin:24px;padding:0;font-size:13px;line-height:1.5}' +
      'h1{margin:0 0 4px}h2{border-left:4px solid #0a7ea4;padding-left:8px}' +
      'table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:11px}' +
      'th,td{border:1px solid #b9c8d0;padding:4px 6px;vertical-align:top;text-align:left}' +
      'thead th{background:#eef3f6;font-weight:700}' +
      'td.num,th.num{text-align:right}' +
      '.note-box{border:1px dashed #b9c8d0;padding:8px;color:#5b7280}' +
      '.preview-wrap{overflow:visible;max-height:none!important;border:0}' +
      '.print-bar{position:sticky;top:0;background:#0a7ea4;color:#fff;padding:10px 14px;margin:-24px -24px 16px;' +
      'display:flex;gap:10px;align-items:center;font-size:13px}' +
      '.print-bar button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:9px 16px;' +
      'background:#fff;color:#075a75;cursor:pointer}' +
      '.print-bar span{opacity:.92}' +
      '@page{size:A4 landscape;margin:10mm}' +
      'tr{page-break-inside:avoid}' +
      '@media print{.no-print,.print-bar{display:none!important}body{margin:0}}';

    if (!w) {
      // pop-up ถูกบล็อก (พบมากบน iOS/Android): แสดงรายงานในหน้าปัจจุบันแทนการพิมพ์
      return inlinePrint(data);
    }
    try {
      w.document.open();
      w.document.write('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>รายงาน Biosecurity</title><style>' + css + '</style></head><body>' +
        '<div class="print-bar" data-noprint><button type="button" onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>' +
        '<span>ถ้าไม่เห็นปุ่มพิมพ์ ให้กดเมนูของเบราว์เซอร์แล้วเลือก “พิมพ์”</span></div>' +
        buildReportHTML(data) + '</body></html>');
      w.document.close();
      // ซ่อนแถบเครื่องมือเมื่อพิมพ์ (ใช้ style ในเอกสารใหม่ ไม่ต้องพึ่ง onclick)
      try {
        var bar = w.document.querySelector('[data-noprint]');
        var doc = w.document;
        var st = doc.createElement("style");
        st.appendChild(doc.createTextNode("@media print{[data-noprint]{display:none!important}}"));
        doc.head.appendChild(st);
        var pr = doc.createElement("button");
        pr.type = "button";
        pr.textContent = "พิมพ์ / บันทึกเป็น PDF";
        pr.addEventListener("click", function () { try { w.print(); } catch (e) {} });
        if (bar) { bar.textContent = ""; bar.appendChild(pr); }
      } catch (e5) {}
    } catch (e) {
      return inlinePrint(data);
    }
    if (autoPrint) {
      try { w.focus(); } catch (e) {}
      setTimeout(function () { try { w.print(); } catch (e) {} }, 600);
    }
    return true;
  }

  /* พิมพ์รายงานจากหน้าปัจจุบัน (ใช้เมื่อ pop-up ถูกบล็อก เช่น บน iOS/Android) */
  function inlinePrint(data) {
    var host = document.createElement("div");
    host.setAttribute("id", "printLayer");
    host.innerHTML = buildReportHTML(data);
    var style = document.createElement("style");
    style.textContent =
      '#printLayer{position:fixed;inset:0;z-index:9999;background:#fff;overflow:auto;padding:16px;' +
      '-webkit-overflow-scrolling:touch}' +
      '#printLayer .print-close{position:sticky;top:0;display:flex;gap:8px;justify-content:flex-end;' +
      'background:#fff;padding:6px 0 10px}' +
      '#printLayer .print-close button{font:inherit;font-weight:700;border:1px solid #0a7ea4;background:#0a7ea4;' +
      'color:#fff;border-radius:8px;padding:9px 16px;margin-left:6px;cursor:pointer}' +
      '#printLayer .print-close button.ghost{background:#fff;color:#075a75}' +
      '#printLayer table{min-width:640px}' +
      '@media print{body>*{display:none!important}#printLayer{display:block!important;position:static;' +
      'padding:0;overflow:visible}#printLayer .print-close{display:none!important}' +
      '#printLayer table{min-width:0}@page{size:A4 landscape;margin:10mm}}';
    var bar = document.createElement("div");
    bar.className = "print-close no-print";
    var bPrint = document.createElement("button");
    bPrint.type = "button";
    bPrint.textContent = "พิมพ์ / บันทึกเป็น PDF";
    var bClose = document.createElement("button");
    bClose.type = "button";
    bClose.className = "ghost";
    bClose.textContent = "ปิด";
    bar.appendChild(bPrint);
    bar.appendChild(bClose);
    host.insertBefore(bar, host.firstChild);
    document.head.appendChild(style);
    document.body.appendChild(host);
    document.body.style.overflow = "hidden";
    function close() {
      document.body.style.overflow = "";
      if (host.parentNode) host.parentNode.removeChild(host);
      if (style.parentNode) style.parentNode.removeChild(style);
    }
    bClose.addEventListener("click", close);
    bPrint.addEventListener("click", function () {
      try { window.print(); } catch (e) {}
    });
    // ปุ่มย้อนกลับของ Android (และ Alt+←) ปิดหน้ารายงานได้
    function onBack() {
      close();
      if (window.removeEventListener) window.removeEventListener("popstate", onBack);
    }
    if (window.addEventListener) window.addEventListener("popstate", onBack);
    close._isInlinePrint = true;
    return true;
  }

  /* ------------------------------------------------------------
     7) Word (.docx)
     ------------------------------------------------------------ */
  function wPara(text, opts) {
    opts = opts || {};
    var size = opts.size || 16;              // half-points
    var bold = opts.bold ? "<w:b/>" : "";
    var color = opts.color ? '<w:color w:val="' + opts.color + '"/>' : "";
    var align = opts.align ? '<w:jc w:val="' + opts.align + '"/>' : "";
    var sp = opts.spaceAfter !== undefined ? '<w:spacing w:after="' + opts.spaceAfter + '"/>' : '<w:spacing w:after="80"/>';
    return '<w:p><w:pPr>' + align + sp + '</w:pPr><w:r><w:rPr>' + bold +
      '<w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>' + color +
      '<w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun" w:eastAsia="Sarabun"/></w:rPr>' +
      '<w:t xml:space="preserve">' + escXml(text) + '</w:t></w:r></w:p>';
  }
  function wTable(section, totalWidth) {
    var cols = section.cols;
    // ปรับความกว้างคอลัมน์ให้พอดีหน้ากระดาษ (หน่วย twips, A4 กว้าง 11906 - ระยะขอบ 1134*2 = 9638)
    var widths = cols.map(function (c) { return c.w; });
    var sumW = widths.reduce(function (a, b) { return a + b; }, 0);
    var usable = totalWidth || 9638;
    var colW = widths.map(function (w) { return Math.round(w / sumW * usable); });

    var x = [];
    x.push('<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="' + usable + '" w:type="dxa"/>' +
      '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>' +
      '</w:tblPr><w:tblGrid>');
    colW.forEach(function (w) { x.push('<w:gridCol w:w="' + w + '"/>'); });
    x.push('</w:tblGrid>');
    // header row
    x.push('<w:tr><w:trPr><w:tblHeader/></w:trPr>');
    cols.forEach(function (c, i) {
      x.push('<w:tc><w:tcPr><w:tcW w:w="' + colW[i] + '" w:type="dxa"/>' +
        '<w:shd w:val="clear" w:color="auto" w:fill="EEF3F6"/></w:tcPr>' +
        '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="15"/><w:szCs w:val="15"/>' +
        '<w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/></w:rPr>' +
        '<w:t xml:space="preserve">' + escXml(c.t) + '</w:t></w:r></w:p></w:tc>');
    });
    x.push('</w:tr>');
    section.rows.forEach(function (r) {
      x.push('<w:tr>');
      cols.forEach(function (c, i) {
        x.push('<w:tc><w:tcPr><w:tcW w:w="' + colW[i] + '" w:type="dxa"/></w:tcPr>' +
          '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="15"/><w:szCs w:val="15"/>' +
          '<w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:cs="Sarabun"/></w:rPr>' +
          '<w:t xml:space="preserve">' + escXml(cellText(r, c)) + '</w:t></w:r></w:p></w:tc>');
      });
      x.push('</w:tr>');
    });
    x.push('</w:tbl>');
    return x.join("");
  }

  function buildDocx(data) {
    var body = [];
    body.push(wPara("รายงานผลการบันทึกข้อมูลฟาร์มกุ้งตามระบบ Biosecurity", { size: 32, bold: true, align: "center", spaceAfter: 40 }));
    body.push(wPara(data.meta.farm, { size: 20, color: "555555", align: "center", spaceAfter: 160 }));
    body.push(wPara("ช่วงข้อมูล: " + data.meta.rangeText, { size: 18 }));
    body.push(wPara("จำนวนรายการรวม: " + data.total + " รายการ", { size: 18 }));
    if (data.meta.by) body.push(wPara("ผู้จัดทำรายงาน: " + data.meta.by, { size: 18 }));
    body.push(wPara("สร้างเมื่อ: " + data.meta.created, { size: 18, color: "555555", spaceAfter: 240 }));

    body.push(wPara("1. สรุปภาพรวม", { size: 24, bold: true, color: "06617F", spaceAfter: 100 }));
    var sumSec = {
      cols: [{ k: "title", t: "หมวดข้อมูล" }, { k: "rows", t: "จำนวนรายการ" }, { k: "lines", t: "สรุปผล" }],
      rows: data.sections.map(function (s) {
        return { title: s.title, rows: s.rows.length, lines: sectionLines(s).join(" / ") || "-" };
      })
    };
    body.push(wTable(sumSec));

    data.sections.forEach(function (s, i) {
      body.push(wPara((i + 2) + ". " + s.title + " (" + s.rows.length + " รายการ)", { size: 24, bold: true, color: "06617F", spaceAfter: 100 }));
      if (!s.rows.length) {
        body.push(wPara("ไม่มีข้อมูลในช่วงที่เลือก", { size: 18, color: "777777", spaceAfter: 200 }));
      } else {
        body.push(wTable(s));
        body.push(wPara("", { size: 16, spaceAfter: 120 }));
      }
    });

    /* --- ช่องลงลายมือชื่อจริง --- */
    body.push(wPara("ลงลายมือชื่อ", { size: 24, bold: true, color: "06617F", spaceAfter: 200 }));
    body.push(wPara("ลงชื่อ ...................................................          ลงชื่อ ...................................................", { size: 18, spaceAfter: 60 }));
    body.push(wPara("ผู้จัดทำรายงาน" + (data.meta.by ? " (" + data.meta.by + ")" : "") + "                              ผู้รับรอง", { size: 18, spaceAfter: 60 }));
    body.push(wPara("วันที่ ........../........../..........                              วันที่ ........../........../..........", { size: 18, spaceAfter: 200 }));
    var sectPr = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>' +
      '<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';

    var files = [];
    files.push({ name: "[Content_Types].xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '</Types>' });
    files.push({ name: "_rels/.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>' });
    files.push({ name: "word/_rels/document.xml.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' });
    files.push({ name: "word/styles.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="Sarabun" w:hAnsi="Sarabun" w:eastAsia="Sarabun" w:cs="Sarabun"/>' +
      '<w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US" w:eastAsia="th-TH" w:bidi="th-TH"/>' +
      '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>' +
      '<w:top w:val="single" w:sz="4" w:space="0" w:color="AAB9C2"/>' +
      '<w:left w:val="single" w:sz="4" w:space="0" w:color="AAB9C2"/>' +
      '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAB9C2"/>' +
      '<w:right w:val="single" w:sz="4" w:space="0" w:color="AAB9C2"/>' +
      '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="AAB9C2"/>' +
      '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="AAB9C2"/>' +
      '</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="70" w:type="dxa"/>' +
      '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
      '</w:styles>' });
    files.push({ name: "word/document.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' + body.join("") + sectPr + '</w:body></w:document>' });

    download(zipBuild(files),
      "รายงาน-biosecurity-" + fileStamp() + ".docx");
  }

  /* ------------------------------------------------------------
     8) Excel (.xlsx) — 1 ชีตต่อหมวด + ชีตสรุป
     ------------------------------------------------------------ */
  function xCol(i) {                       // 0 -> A, 25 -> Z, 26 -> AA
    var s = "";
    i = i + 1;
    while (i > 0) {
      var m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }
  function sheetName(s, used) {
    var base = s.replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 28) || "Sheet";
    var name = base, n = 1;
    while (used[name]) { name = base.slice(0, 26) + "_" + n; n++; }
    used[name] = true;
    return name;
  }
  function xCell(ref, value, opts) {
    opts = opts || {};
    var style = opts.style !== undefined ? ' s="' + opts.style + '"' : "";
    if (opts.num && value !== "" && value !== null && isFinite(parseFloat(value))) {
      return '<c r="' + ref + '"' + style + '><v>' + parseFloat(value) + '</v></c>';
    }
    var text = value === null || value === undefined ? "" : String(value);
    return '<c r="' + ref + '"' + style + ' t="inlineStr"><is><t xml:space="preserve">' + escXml(text) + '</t></is></c>';
  }
  function buildSheetXML(rows, widths) {
    var x = [];
    x.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>');
    if (widths && widths.length) {
      x.push('<cols>');
      widths.forEach(function (w, i) {
        x.push('<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>');
      });
      x.push('</cols>');
    }
    x.push('<sheetData>');
    rows.forEach(function (row, ri) {
      x.push('<row r="' + (ri + 1) + '"' + (ri === 0 ? ' ht="22" customHeight="1"' : "") + '>');
      row.forEach(function (cell, ci) {
        if (cell === null || cell === undefined) return;
        var val = cell, style = ri === 0 ? 1 : 0, isNum = false;
        if (typeof cell === "object") { val = cell.v; style = cell.s !== undefined ? cell.s : (ri === 0 ? 1 : 0); isNum = !!cell.n; }
        x.push(xCell(xCol(ci) + (ri + 1), val, { style: style, num: isNum }));
      });
      x.push('</row>');
    });
    x.push('</sheetData></worksheet>');
    return x.join("");
  }

  function buildXlsx(data) {
    var used = {};
    var sheets = [];
    // ชีตสรุป
    var sumRows = [
      [{ v: "รายงานผลการบันทึกข้อมูลฟาร์มกุ้งตามระบบ Biosecurity", s: 2 }],
      [{ v: data.meta.farm }],
      [{ v: "ช่วงข้อมูล: " + data.meta.rangeText }],
      [{ v: "จำนวนรายการรวม: " + data.total + " รายการ" }],
      data.meta.by ? [{ v: "ผู้จัดทำรายงาน: " + data.meta.by }] : [],
      [{ v: "สร้างเมื่อ: " + data.meta.created }],
      [],
      [{ v: "หมวดข้อมูล", s: 1 }, { v: "จำนวนรายการ", s: 1 }, { v: "สรุปผล", s: 1 }]
    ].filter(function (r) { return r.length; });
    data.sections.forEach(function (s) {
      sumRows.push([{ v: s.title }, { v: s.rows.length, n: true }, { v: sectionLines(s).join(" / ") || "-" }]);
    });
    sheets.push({ name: "สรุปภาพรวม", xml: buildSheetXML(sumRows, [34, 14, 90]) });

    data.sections.forEach(function (s) {
      var head = s.cols.map(function (c) { return { v: c.t, s: 1 }; });
      var rows = [head];
      s.rows.forEach(function (r) {
        rows.push(s.cols.map(function (c) {
          var isNum = !!c.type;
          var v;
          if (c.calc === "feedTotal") v = num(r.feed0830) + num(r.feed1200) + num(r.feed1600) + num(r.feed2000);
          else if (c.calc === "deadTotal") v = num(r.dead0830) + num(r.dead1600);
          else v = r[c.k];
          if (c.type === "date") return { v: thDateShort(r.date) };
          if (isNum) return (has(v) && isFinite(parseFloat(v))) ? { v: parseFloat(v), n: true } : { v: "-" };
          return { v: (has(v) ? String(v) : "-") };
        }));
      });
      if (rows.length === 1) rows.push([{ v: "ไม่มีข้อมูลในช่วงที่เลือก" }]);
      var widths = s.cols.map(function (c) { return Math.max(12, Math.min(38, Math.round(c.w * 1.1))); });
      sheets.push({ name: sheetName(s.title, used), xml: buildSheetXML(rows, widths) });
    });

    var files = [];
    var sheetOverrides = sheets.map(function (s, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join("");
    files.push({ name: "[Content_Types].xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheetOverrides + '</Types>' });
    files.push({ name: "_rels/.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>' });

    var sheetEntries = sheets.map(function (s, i) {
      return '<sheet name="' + escXml(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    }).join("");
    files.push({ name: "xl/workbook.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' + sheetEntries + '</sheets></workbook>' });

    var rels = sheets.map(function (s, i) {
      return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    }).join("");
    files.push({ name: "xl/_rels/workbook.xml.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      rels +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>' });

    files.push({ name: "xl/styles.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="3">' +
      '<font><sz val="11"/><name val="Sarabun"/><charset val="222"/></font>' +
      '<font><b/><sz val="11"/><name val="Sarabun"/><charset val="222"/></font>' +
      '<font><b/><sz val="14"/><name val="Sarabun"/><charset val="222"/></font>' +
      '</fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF3F6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FFAAB9C2"/></left><right style="thin"><color rgb="FFAAB9C2"/></right>' +
      '<top style="thin"><color rgb="FFAAB9C2"/></top><bottom style="thin"><color rgb="FFAAB9C2"/></bottom><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="3">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' });

    sheets.forEach(function (s, i) {
      files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: s.xml });
    });

    download(zipBuild(files), "ข้อมูล-biosecurity-" + fileStamp() + ".xlsx");
  }

  /* ------------------------------------------------------------
     9) PowerPoint (.pptx) — 1 สไลด์ต่อหมวด + สไลด์สรุป
     ------------------------------------------------------------ */
  var SLIDE_W = 12192000, SLIDE_H = 6858000;

  function pRun(text, opts) {
    opts = opts || {};
    var sz = opts.size || 1400;
    var fill = opts.color ? '<a:solidFill><a:srgbClr val="' + opts.color + '"/></a:solidFill>' : '';
    return '<a:r><a:rPr lang="th-TH" sz="' + sz + '" dirty="0"' + (opts.bold ? ' b="1"' : '') + '>' + fill +
      '<a:latin typeface="Sarabun"/><a:ea typeface="Sarabun"/><a:cs typeface="Sarabun"/></a:rPr>' +
      '<a:t>' + escXml(text) + '</a:t></a:r>';
  }
  function pPara(runs, opts) {
    opts = opts || {};
    var algn = opts.align ? ' algn="' + opts.align + '"' : "";
    var spc = opts.spaceAfter !== undefined ? '<a:spcAft><a:spcPts val="' + opts.spaceAfter + '"/></a:spcAft>' : "";
    var bullet = opts.bullet ? '<a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>' : '<a:buNone/>';
    var mar = opts.bullet ? 228600 : 0;
    return '<a:p><a:pPr' + algn + ' marL="' + mar + '" indent="' + (opts.bullet ? -228600 : 0) + '">' +
      bullet + spc + '</a:pPr>' + runs.join("") + '</a:p>';
  }
  function pTextBox(id, name, x, y, cx, cy, paras) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="' + escXml(name) + '"/>' +
      '<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"><a:normAutofit/></a:bodyPr>' +
      '<a:lstStyle/>' + paras.join("") + '</p:txBody></p:sp>';
  }
  function pRect(id, x, y, cx, cy, color) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Bar' + id + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
      '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>';
  }
  function pCard(id, x, y, cx, cy, value, label) {
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Card' + id + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>' +
      '<a:solidFill><a:srgbClr val="F4F7F9"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D6E0E6"/></a:solidFill></a:ln></p:spPr>' +
      '<p:txBody><a:bodyPr anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
      pPara([pRun(String(value), { size: 3200, bold: true, color: "06617F" })], { align: "ctr", spaceAfter: 200 }) +
      pPara([pRun(label, { size: 1100, color: "274852" })], { align: "ctr" }) +
      '</p:txBody></p:sp>';
  }
  function slideXML(shapes) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      shapes.join("") + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
  }

  function buildSlides(data) {
    var slides = [];
    var pad = 548640;
    var contentW = SLIDE_W - pad * 2;

    /* --- slide 1: ปก --- */
    var s1 = [];
    s1.push(pRect(2, 0, 0, SLIDE_W, 1600200, "0A7EA4"));
    s1.push(pTextBox(3, "Title", pad, 320000, contentW, 1000000, [
      pPara([pRun("รายงานผลการบันทึกข้อมูลฟาร์มกุ้ง", { size: 3200, bold: true, color: "FFFFFF" })], { spaceAfter: 600 }),
      pPara([pRun("ระบบ Biosecurity", { size: 2400, color: "D6ECF5" })])
    ]));
    s1.push(pTextBox(4, "Sub", pad, 1950000, contentW, 2200000, [
      pPara([pRun(data.meta.farm, { size: 1800, color: "0F2B33" })], { spaceAfter: 900 }),
      pPara([pRun("ช่วงข้อมูล: " + data.meta.rangeText, { size: 1600, color: "274852" })], { spaceAfter: 500 }),
      pPara([pRun("จำนวนรายการรวม: " + data.total + " รายการ", { size: 1600, color: "274852" })], { spaceAfter: 500 }),
      (data.meta.by ? pPara([pRun("ผู้จัดทำรายงาน: " + data.meta.by, { size: 1600, color: "274852" })], { spaceAfter: 500 }) : ""),
      pPara([pRun("สร้างเมื่อ: " + data.meta.created, { size: 1400, color: "5B7280" })])
    ]));
    slides.push(slideXML(s1));

    /* --- slide 2: สรุปภาพรวม --- */
    var s2 = [];
    s2.push(pRect(2, 0, 0, SLIDE_W, 950000, "EEF3F6"));
    s2.push(pTextBox(3, "H", pad, 180000, contentW, 700000, [
      pPara([pRun("สรุปภาพรวมจำนวนรายการ", { size: 2600, bold: true, color: "0A7EA4" })], { spaceAfter: 200 }),
      pPara([pRun(data.meta.rangeText, { size: 1100, color: "5B7280" })])
    ]));
    var count = data.sections.length;
    var gap = 120000;
    var perRow = Math.min(count, 5);
    var boxW = Math.floor((contentW - gap * (perRow - 1)) / perRow);
    data.sections.forEach(function (s, i) {
      var row = Math.floor(i / perRow), col = i % perRow;
      var x = pad + col * (boxW + gap);
      var y = 1150000 + row * 1500000;
      if (y + 1400000 > SLIDE_H - 200000) return;
      s2.push(pCard(10 + i, x, y, boxW, 1300000, s.rows.length, s.title));
    });
    slides.push(slideXML(s2));

    /* --- 1 สไลด์ต่อหมวด --- */
    data.sections.forEach(function (s) {
      var shapes = [];
      shapes.push(pRect(2, 0, 0, SLIDE_W, 950000, "EEF3F6"));
      shapes.push(pTextBox(3, "H", pad, 170000, contentW, 750000, [
        pPara([pRun(s.title, { size: 2200, bold: true, color: "0A7EA4" })], { spaceAfter: 200 }),
        pPara([pRun("จำนวน " + s.rows.length + " รายการ | " + data.meta.rangeText, { size: 1100, color: "5B7280" })])
      ]));
      var lines = sectionLines(s);
      var y = 1080000;
      if (lines.length) {
        var hLines = Math.min(1400000, lines.length * 300000 + 120000);
        shapes.push(pTextBox(4, "Lines", pad, y, contentW, hLines,
          lines.map(function (l) {
            return pPara([pRun(l, { size: 1200, color: "274852" })], { bullet: true, spaceAfter: 200 });
          })));
        y += hLines + 60000;
      }
      var show = s.rows.slice(0, 8);
      var paras = [pPara([pRun("ตัวอย่างข้อมูลล่าสุด (สูงสุด 8 แถว)", { size: 1300, bold: true, color: "0F2B33" })], { spaceAfter: 200 })];
      show.forEach(function (r) {
        var parts = [];
        s.cols.slice(0, 6).forEach(function (c) {
          var v = cellText(r, c);
          if (v !== "-") parts.push(c.t + " " + v);
        });
        paras.push(pPara([pRun(parts.join("  |  "), { size: 1050, color: "274852" })], { bullet: true, spaceAfter: 100 }));
      });
      if (!show.length) paras.push(pPara([pRun("ไม่มีข้อมูลในช่วงที่เลือก", { size: 1400, color: "777777" })]));
      shapes.push(pTextBox(5, "Rows", pad, y, contentW, SLIDE_H - y - 260000, paras));
      slides.push(slideXML(shapes));
    });

    /* --- สไลด์สุดท้าย --- */
    var sEnd = [];
    sEnd.push(pRect(2, 0, 0, SLIDE_W, 1600200, "0A7EA4"));
    sEnd.push(pTextBox(3, "End", pad, 420000, contentW, 800000, [
      pPara([pRun("รายงานสรุปผลการเลี้ยงกุ้งตามระบบ Biosecurity", { size: 2400, bold: true, color: "FFFFFF" })])
    ]));
    sEnd.push(pTextBox(4, "EndSub", pad, 2000000, contentW, 2600000, [
      pPara([pRun("จัดทำโดย: " + (data.meta.by || data.meta.farm), { size: 1800, color: "0F2B33" })], { spaceAfter: 600 }),
      pPara([pRun("ช่วงข้อมูล: " + data.meta.rangeText, { size: 1600, color: "274852" })], { spaceAfter: 500 }),
      pPara([pRun("จำนวนรายการรวม: " + data.total + " รายการ", { size: 1600, color: "274852" })], { spaceAfter: 500 }),
      pPara([pRun("สร้างเมื่อ: " + data.meta.created, { size: 1400, color: "5B7280" })])
    ]));
    slides.push(slideXML(sEnd));
    return slides;
  }

  function buildPptx(data) {
    var slides = buildSlides(data);
    var files = [];
    var n = slides.length, i;
    var slideOverrides = "", slideList = "", slideRels = "";
    for (i = 1; i <= n; i++) {
      slideOverrides += '<Override PartName="/ppt/slides/slide' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
      slideList += '<p:sldId id="' + (255 + i) + '" r:id="rId' + (i + 1) + '"/>';
      slideRels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + i + '.xml"/>';
    }
    files.push({ name: "[Content_Types].xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
      '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
      '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
      slideOverrides + '</Types>' });
    files.push({ name: "_rels/.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
      '</Relationships>' });
    files.push({ name: "ppt/presentation.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
      '<p:sldIdLst>' + slideList + '</p:sldIdLst>' +
      '<p:sldSz cx="' + SLIDE_W + '" cy="' + SLIDE_H + '"/><p:notesSz cx="6858000" cy="9144000"/>' +
      '</p:presentation>' });
    files.push({ name: "ppt/_rels/presentation.xml.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
      slideRels +
      '<Relationship Id="rId' + (n + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
      '</Relationships>' });
    files.push({ name: "ppt/slideMasters/slideMaster1.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
      '<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>' +
      '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      '</p:spTree></p:cSld>' +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" ' +
      'accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
      '<p:txStyles>' +
      '<p:titleStyle><a:lvl1pPr><a:defRPr sz="4000"><a:latin typeface="Sarabun"/><a:cs typeface="Sarabun"/></a:defRPr></a:lvl1pPr></p:titleStyle>' +
      '<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:latin typeface="Sarabun"/><a:cs typeface="Sarabun"/></a:defRPr></a:lvl1pPr></p:bodyStyle>' +
      '<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"><a:latin typeface="Sarabun"/><a:cs typeface="Sarabun"/></a:defRPr></a:lvl1pPr></p:otherStyle>' +
      '</p:txStyles></p:sldMaster>' });
    files.push({ name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
      '</Relationships>' });
    files.push({ name: "ppt/slideLayouts/slideLayout1.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">' +
      '<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
      '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
      '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>' });
    files.push({ name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
      '</Relationships>' });
    files.push({ name: "ppt/theme/theme1.xml", data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Biosecurity"><a:themeElements>' +
      '<a:clrScheme name="Bio"><a:dk1><a:srgbClr val="0F2B33"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>' +
      '<a:dk2><a:srgbClr val="06617F"/></a:dk2><a:lt2><a:srgbClr val="EEF3F6"/></a:lt2>' +
      '<a:accent1><a:srgbClr val="0A7EA4"/></a:accent1><a:accent2><a:srgbClr val="1E7F52"/></a:accent2>' +
      '<a:accent3><a:srgbClr val="B1690C"/></a:accent3><a:accent4><a:srgbClr val="3B4FA8"/></a:accent4>' +
      '<a:accent5><a:srgbClr val="6B3FA0"/></a:accent5><a:accent6><a:srgbClr val="A12A55"/></a:accent6>' +
      '<a:hlink><a:srgbClr val="0A7EA4"/></a:hlink><a:folHlink><a:srgbClr val="06617F"/></a:folHlink></a:clrScheme>' +
      '<a:fontScheme name="Bio"><a:majorFont><a:latin typeface="Sarabun"/><a:ea typeface="Sarabun"/><a:cs typeface="Sarabun"/></a:majorFont>' +
      '<a:minorFont><a:latin typeface="Sarabun"/><a:ea typeface="Sarabun"/><a:cs typeface="Sarabun"/></a:minorFont></a:fontScheme>' +
      '<a:fmtScheme name="Bio"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
      '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
      '<a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
      '<a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
      '<a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
      '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle>' +
      '<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
      '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
      '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
      '</a:fmtScheme></a:themeElements></a:theme>' });
    for (i = 1; i <= n; i++) {
      files.push({ name: "ppt/slides/slide" + i + ".xml", data: slides[i - 1] });
      files.push({ name: "ppt/slides/_rels/slide" + i + ".xml.rels", data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
        '</Relationships>' });
    }
    download(zipBuild(files), "นำเสนอ-biosecurity-" + fileStamp() + ".pptx");
  }

  /* ------------------------------------------------------------
     10) JSON: ส่งออก / นำเข้า
     ------------------------------------------------------------ */
  var JSON_APP = "biosecurity-shrimp-farm";
  var JSON_VERSION = 1;

  function buildJsonPayload(db, opts) {
    var data = buildData(db, opts);
    var out = {
      app: JSON_APP,
      version: JSON_VERSION,
      schema: "ศวพช-biosecurity-v1",
      exportedAt: new Date().toISOString(),
      exportedAtThai: thNow(),
      farm: data.meta.farm,
      by: data.meta.by,
      range: { from: data.meta.from || null, to: data.meta.to || null },
      modules: {},
      summary: []
    };
    data.sections.forEach(function (s) {
      out.modules[s.key] = { title: s.title, count: s.rows.length, records: s.rows };
      out.summary.push({ key: s.key, title: s.title, count: s.rows.length, lines: sectionLines(s) });
    });
    out.totalRecords = data.total;
    return out;
  }

  function exportJson(db, opts) {
    var payload = buildJsonPayload(db, opts);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    download(blob, "ข้อมูล-biosecurity-" + fileStamp() + ".json");
    return payload.totalRecords;
  }

  /* ตรวจформатไฟล์ JSON แล้วแปลงเป็น { module: [rows] } */
  function parseJsonFile(text) {
    var parsed = JSON.parse(text);
    var out = { modules: {}, total: 0, farm: "", exportedAtTh: "", version: null, warnings: [] };
    var known = M.map(function (m) { return m.key; });

    if (parsed && parsed.modules && typeof parsed.modules === "object") {
      // รูปแบบที่ระบบนี้ส่งออก
      known.forEach(function (k) {
        var mod = parsed.modules[k];
        var rows = null;
        if (Array.isArray(mod)) rows = mod;
        else if (mod && Array.isArray(mod.records)) rows = mod.records;
        if (rows) {
          out.modules[k] = rows.filter(function (r) { return r && typeof r === "object"; }).map(normalizeRow);
          out.total += out.modules[k].length;
        }
      });
      out.farm = parsed.farm || "";
      out.exportedAtTh = parsed.exportedAtThai || parsed.exportedAt || "";
      out.version = parsed.version || null;
      var unknown = Object.keys(parsed.modules).filter(function (k) { return known.indexOf(k) === -1; });
      if (unknown.length) out.warnings.push("ข้ามหมวดที่ไม่รู้จัก: " + unknown.join(", "));
    } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // รูปแบบข้อมูลดิบของ localStorage: { access:[], feed:[] ... }
      var found = 0;
      known.forEach(function (k) {
        if (Array.isArray(parsed[k])) {
          out.modules[k] = parsed[k].filter(function (r) { return r && typeof r === "object"; }).map(normalizeRow);
          out.total += out.modules[k].length;
          found++;
        }
      });
      if (!found) out.warnings.push("ไม่พบหมวดข้อมูลที่ระบบรู้จักในไฟล์นี้");
      out.exportedAtTh = parsed.exportedAt || "";
    } else {
      throw new Error("โครงสร้างไฟล์ JSON ไม่ถูกต้อง");
    }
    return out;
  }

  function normalizeRow(r) {
    var row = {};
    Object.keys(r).forEach(function (k) {
      var v = r[k];
      if (v === null || typeof v === "object") { row[k] = v === null ? "" : JSON.stringify(v); }
      else row[k] = v;
    });
    if (!row.date || typeof row.date !== "string") row.date = row.date ? String(row.date) : "";
    if (!row.id) row.id = "imp" + Math.random().toString(36).slice(2, 10);
    return row;
  }

  function mergeImport(db, imported, mode) {
    var added = 0, skipped = 0, replaced = 0;
    M.forEach(function (m) {
      var incoming = imported.modules[m.key] || [];
      if (mode === "replace") {
        if (db[m.key] && db[m.key].length) replaced += db[m.key].length;
        db[m.key] = incoming.slice();
        added += incoming.length;
        return;
      }
      if (!Array.isArray(db[m.key])) db[m.key] = [];
      var seen = {};
      db[m.key].forEach(function (r) { seen[signature(r)] = true; });
      incoming.forEach(function (r) {
        var sig = signature(r);
        if (seen[sig]) { skipped++; return; }
        seen[sig] = true;
        db[m.key].push(r);
        added++;
      });
    });
    return { added: added, skipped: skipped, replaced: replaced };
  }
  function signature(r) {
    var copy = {};
    Object.keys(r).sort().forEach(function (k) { if (k !== "id") copy[k] = r[k]; });
    return JSON.stringify(copy);
  }

  /* ------------------------------------------------------------
     11) API หลัก
     ------------------------------------------------------------ */
  return {
    MODULES: M,
    buildData: buildData,
    buildReportHTML: buildReportHTML,
    openPrintWindow: openPrintWindow,
    buildDocx: buildDocx,
    buildXlsx: buildXlsx,
    buildPptx: buildPptx,
    exportJson: exportJson,
    parseJsonFile: parseJsonFile,
    mergeImport: mergeImport,
    sectionLines: sectionLines,
    thDateFull: thDateFull,
    thDateShort: thDateShort,
    thNow: thNow,
    fileStamp: fileStamp
  };
})();
