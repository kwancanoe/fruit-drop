# Fruit Drop: Workspace Ironclad Rules (กฎเหล็กประจำโปรเจกต์)

กฎเหล่านี้มีผลบังคับใช้สูงสุดตลอดการพัฒนาโปรเจกต์ Fruit Drop เพื่อป้องกันปัญหา Spacing, Layout แตก, CSS มั่ว และทำให้ระบบมีความเสถียร สวยงาม และเข้ากับ Quasar 100%

---

## 1. การใช้ Quasar Environment 100% (Strict Quasar Purity)
- **ห้ามเขียน Custom CSS เองตามอำเภอใจ**: ให้ใช้ Utility Classes ของ Quasar ทั้งหมด (Typography, Flexbox, Alignment, Elevation/Shadow, Border-radius)
- **การกำหนดสี**: อนุโลมให้ใช้ #hex ได้เฉพาะกรณีที่จำเป็นจริง โดยต้องประกาศไว้เป็น **Global SCSS Variables** ใน src/css/quasar.variables.scss หรือ src/css/app.scss เท่านั้น ห้ามเขียน Inline Style #hex ฝังเดี่ยวๆ ใน Component

## 2. ระบบ Transition & Animation (Quasar Native First)
- ห้ามเขียน @keyframes หรือ CSS Animation แบบกำหนดเอง เว้นแต่ไม่มีในระบบจริงๆ
- ให้ใช้ Animation และ Transition ในตัวของ Quasar เป็นอันดับแรก เช่น:
  - 	ransition-show= jump-down transition-hide=jump-up
  - คลาส Quasar Animate (เช่น nimated fadeIn, nimated bounceIn)
  - <q-slide-transition>

## 3. เอกภาพและความสม่ำเสมอของ Component (Identical & Consistency)
- คุณสมบัติพื้นฐาน (Border-radius, Shadow, Elevation, Font Weight) ต้องถูกกำหนดแบบ Global ผ่าน SCSS Tokens
- **Semantic Command Colors (สีของปุ่มสั่งการตามหน้าที่)**:
  - **ปุ่มยืนยัน / ส่งมอบ / บันทึก (Submit / Confirm / Deliver)**: สีเขียว ($positive หรือ #2E7D32)
  - **ปุ่มยกเลิก / ปฏิเสธ / ลบ (Cancel / Delete / Reject)**: สีแดง ($negative หรือ #C62828)
  - **ปุ่มแจ้งเตือน / รอดำเนินการ / เก็บเงินสด (Warning / Pending / Cash)**: สีส้มอำพัน ($warning หรือ #EF6C00)
  - **ปุ่มนำทาง / รายละเอียด / เสริม (Action / Info / Nav)**: สีหลัก ($primary หรือ $secondary)
  - แก้ไขตัวแปรสีที่เดียว ต้องส่งผลกระทบไปทุก Component ทั้งระบบ

## 4. กฎเหล็กเรื่อง Spacing (BANNED: q-gutter)
- ❌ **ห้ามใช้ q-gutter โดยเด็ดขาด**: q-gutter มีปัญหาเรื่องการ Wrap และการตัดขึ้นบรรทัดใหม่เมื่อ Elements ลูกมีจำนวนมาก ทำให้ขอบล้นจอ (Negative Margin Bug)
- ✅ **ให้ใช้ Quasar Margin & Padding Classes โดยตรง**: 
  - เช่น q-pa-sm, q-pa-md, q-ma-xs, q-mt-sm, q-mb-md, q-px-lg
  - หรือใช้ Flexbox gaps / Flex layout ร่วมกับ Margin/Padding ที่แม่นยำ

## 5. การเคารพระบบ Grid ของ Quasar อย่างเคร่งครัด (Responsive Grid & Hierarchy)
- การจัดตำแหน่งเลย์เอาต์ ต้องใช้ ow และ col, col-xs-*, col-sm-*, col-md-* ของ Quasar เสมอ
- ห้ามใช้ position: absolute / relative เพื่อจัดตำแหน่งเนื้อหาแบบลอยๆ เพราะจะพังทันทีเมื่อหน้าจอเปลี่ยนขนาด
- ภายใน <q-card> หรือ <q-item> ต้องใช้ Sub-components ของ Quasar ให้ถูกต้อง:
  - <q-item-section avatar> สำหรับรูปหรือไอคอน
  - <q-item-section> สำหรับเนื้อหาหลัก
  - <q-item-section side> สำหรับปุ่มกดหรือข้อความสถานะด้านขวา

## 6. โลโก้และ Brand Identity (Nano Banana Mascot)
- ใช้รูปมาสคอต 2.5D (น้องเงาะและน้องทุเรียนในตะกร้าผลไม้ Fruit Drop) เป็น Identity หลักของแอป
- ต้องนำไปติดตั้งเป็น App Icon, Favicon และ PWA Splash Icon ทั้งหมด

## 7. White-label & Clean Customer Link (ลบร่องรอย Quasar / Vue 100%)
- ลิงก์และหน้าเว็บที่ลูกค้าเปิดดู ต้องไม่มีร่องรอย Default ของ Quasar หรือ Vue หลงเหลืออยู่:
  - <title> ต้องเป็น: **Fruit Drop - สั่งจองผลไม้สด**
  - Meta Tags (Open Graph / Twitter Card): วันที่ส่งของ จุดนัดรับ พร้อมภาพพรีวิวโลโก้
  - Favicon / Apple Touch Icon: เปลี่ยนเป็นไอคอน Fruit Drop 2.5D แทนโลโก้ Quasar
  - ข้อมูลส่วนหัว/ส่วนท้าย: เป็นแบรนด์ Fruit Drop 100% (ห้ามมีคำว่า สวนบ้านเรา)

## 8. กฎเหล็กการ Bump Version และ Git Commit เสมอ (Automatic Version Bump & Git Commit Discipline)
- **ต้อง Bump Version เสมอ**: ทุกครั้งที่แก้ไขโค้ด ปรับปรุง UI หรือแก้ไขบั๊กตามคำสั่งเสร็จสิ้น จะต้องปรับเพิ่มเลขเวอร์ชันใน `package.json` และ `.agent_handoff.md` เสมอ (เช่น `0.7.1` -> `0.7.2`)
- **ต้อง Git Commit ทุกครั้ง**: เมื่อทดสอบ Typecheck / Build ผ่านเรียบร้อยแล้ว ต้องทำการรัน `git add .` และ commit ด้วย Git Commit Message ที่ชัดเจน กระชับ และระบุเลขเวอร์ชันเสมอ ห้ามจบงานโดยไม่ commit เด็ดขาด

