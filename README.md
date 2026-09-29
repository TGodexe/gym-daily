# FORM // Progress Tracker

เว็บส่วนตัวสำหรับบันทึก Progress Photos และเปรียบเทียบ Before / After

## ฟีเจอร์
- เพิ่มรูป Front / Side / Back รายวัน
- บันทึก Weight / Waist / Body Fat / Note
- Compare 2 วันที่ด้วย Slider
- Timeline ย้อนหลัง
- Export / Import Backup
- ข้อมูลเก็บใน IndexedDB ของ Browser
- ไม่มี OpenAI, API, Analytics หรือระบบบัญชี
- Responsive ใช้บนมือถือได้
- PWA/offline เมื่อรันผ่าน HTTP/HTTPS

## วิธีใช้แบบง่ายที่สุด
เปิด `index.html` ด้วย Browser ได้เลย

> หมายเหตุ: Browser บางตัวจำกัด IndexedDB เมื่อเปิดผ่าน `file://`
> ถ้าเจอปัญหา ให้รันผ่าน local server ตามวิธีด้านล่าง

## วิธีรันผ่าน Local Server

### Python
เปิด Terminal ในโฟลเดอร์นี้แล้วรัน:

```bash
python -m http.server 8080
```

จากนั้นเปิด:
`http://localhost:8080`

### VS Code
ใช้ extension "Live Server" แล้วเปิด `index.html`

## การนำขึ้น GitHub Pages
1. สร้าง repository
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
3. Settings > Pages
4. เลือก Deploy from a branch
5. เลือก `main` และ `/root`
6. Save

## ความเป็นส่วนตัว
ข้อมูลและรูปทั้งหมดถูกเก็บใน browser ของเครื่องที่ใช้งาน
หากล้าง Site Data / Browser Storage ข้อมูลอาจหายได้
จึงควรใช้หน้า Backup เพื่อ Export เป็นระยะ

ไฟล์ Backup มีรูปส่วนตัวอยู่ด้วย ควรเก็บไว้ในที่ปลอดภัย
