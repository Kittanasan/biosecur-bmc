/* ตั้งค่าที่เก็บข้อมูลกลาง (Google Sheets) — ผู้ดูแลระบบแก้ไฟล์นี้ครั้งเดียว ทุกเครื่องจะใช้ร่วมกัน
   syncUrl  = ลิงก์ Web App จาก Google Apps Script (ลงท้าย /exec) ดูขั้นตอนใน SETUP-GOOGLE-SHEETS.md
   sheetUrl = ลิงก์ Google Sheets สำหรับปุ่ม "เปิดดูใน Google Sheets" (ไม่บังคับ)
   ปล่อยว่าง = ใช้แบบเก็บในเครื่องอย่างเดียว (ผู้ใช้แต่ละคนตั้งค่าเองได้ที่ปุ่ม "ข้อมูลกลาง")
   หมายเหตุ: ห้ามใส่รหัสทีมในไฟล์นี้ (ไฟล์นี้เป็นสาธารณะ) */
window.BIO_CONFIG = {
  syncUrl: "https://script.google.com/macros/s/AKfycbx6ZKAyAVGhWMUlWenCyDB_v9nX5_uDW3VLiRzHL1Oa14DtIlO9hNwxjP5O2LjNn3wO/exec",
  sheetUrl: "https://docs.google.com/spreadsheets/d/1-w_0wW8bBVnWa2Bko043Wfgc75sLGtEDR7VNczccBbg/edit?usp=sharing"
};
