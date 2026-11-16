/* Service worker: ให้เปิดใช้งานแบบออฟไลน์ได้หลังเข้าเว็บครั้งแรก
   กลยุทธ์ "เครือข่ายก่อน แคชสำรอง" — ออนไลน์อยู่ได้ไฟล์ล่าสุดเสมอ (ไม่ค้างเวอร์ชันเก่า)
   ส่วนตอนออฟไลน์/เน็ตหลุด จะใช้ไฟล์ที่เก็บไว้ล่าสุดแทน
   ข้อมูลที่ผู้ใช้บันทึกอยู่ใน localStorage ของเบราว์เซอร์ ไม่เกี่ยวกับแคชนี้ */
var CACHE = "biosecurity-shell-v1";
var SHELL = [
  "./",
  "index.html",
  "js/app.js",
  "js/report.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // ใส่ทีละไฟล์: ไฟล์ใดโหลดไม่ได้ ไม่ทำให้ติดตั้งล้มทั้งชุด
      return Promise.all(SHELL.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // ไม่ยุ่งกับโดเมนอื่น

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        // เปิดหน้าแรกตอนออฟไลน์ (เช่น พิมพ์ที่อยู่ซ้ำ หรือมี ?query ต่อท้าย)
        if (req.mode === "navigate") return caches.match("index.html");
        return Response.error();
      });
    })
  );
});
