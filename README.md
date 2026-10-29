# Companion Dating & Social Booking Platform (ແພລັດຟອມຈອງຄູ່ເດດ ແລະ ງານລ້ຽງ)

ລະບົບຄົບວົງຈອນ (Full-stack Platform) ສໍາລັບການຈອງຄູ່ເດດ, ໝູ່ທ່ຽວ, ດື່ມ, ງານລ້ຽງ ແລະ ຮັບປະທານອາຫານ ພ້ອມລະບົບປ້ອງກັນການໂອນເງິນນອກລະບົບ (Anti-Leak Escrow Protection).

---

## 🌟 ໂຄງສ້າງລະບົບ (System Overview)

| Component | URL / Port | ເທັກໂນໂລຊີ | ລາຍລະອຽດ |
| :--- | :--- | :--- | :--- |
| **Backend API & Real-time Server** | `http://localhost:5000` | Node.js + Express + Prisma + SQLite + Socket.io | ລະບົບຖານຂໍ້ມູນ, ຈັດການ Booking, Escrow, ລະບົບກັ່ນຕອງຄໍາສັບ/ເບີໂທ/ເລກບັນຊີໃນແຊັດ |
| **Admin Web Management Portal** | `http://localhost:3000` | React + Vite + Tailwind CSS + Lucide | ໜ້າ Dashboard ສໍາລັບ Admin: ກວດບັດ KYC, ກວດສະລິບໂອນເງິນ, ປົດລັອກ Escrow, ຕັ້ງຄ່າ Commission % |
| **Mobile App (Web Preview & PWA)** | `http://localhost:5173` | React Mobile UI + Socket.io Client + Tailwind | ໜ້າແອັບສໍາລັບລູກຄ້າ ແລະ Companion: ຄົ້ນຫາຄູ່ເດດ, Feed ຮູບ/ວິດີໂອ, ແຊັດສົດ, ສົ່ງ Offer Card, ສະແກນ QR ແລະ ອັບໂຫຼດສະລິບ |

---

## 🛡️ ວິທີທີ່ລະບົບປ້ອງກັນການໂອນເງິນນອກລະບົບ (Anti-Leak Architecture)

1. **Anti-Leak Chat Content Filter:**  
   - ລະບົບຈະກວດຈັບເບີໂທລະສັບລາວ (020..., 030...), ເລກບັນຊີທະນາຄານ (8-16 ຫຼັກ), ແລະ ຄໍາສັບກ່ຽວກັບການໂອນເງິນ/ແອັບອື່ນ (BCEL, OnePay, LAPNet, WhatsApp, WeChat, QR Code).
   - ຖ້າກວດພົບ, ຂໍ້ຄວາມຈະຖືກເຊັນເຊີເປັນ `[BLOCKED CONTACT/ACCOUNT]` ແລະ ມີສັນຍານເຕືອນຄວາມປອດໄພທັນທີ.
2. **In-Chat Official Offer Card (ສັນຍາດິຈິຕອນ):**  
   - ບໍ່ໃຫ້ຕົກລົງດ້ວຍປາກເປົ່າ. ທັງສອງຝ່າຍສົ່ງ Offer Card ລະບຸສະຖານທີ່ (ຮ້ານ/ໂຮງແຮມ), ວັນທີ, ເວລາ, ແລະ ລາຄາ. ອີກຝ່າຍຕ້ອງກົດ **Accept Agreement**.
3. **Escrow Bank QR & Slip Upload (ການຈ່າຍເງິນກັກກາງ):**  
   - ລະບົບສ້າງ QR Code ຂອງບໍລິສັດພ້ອມ Ref Code ສະເພາະ.
   - ລູກຄ້າໂອນແລ້ວອັບໂຫຼດໃບບິນ (Slip).
   - Admin ກວດສອບໃນ **Admin Portal (port 3000)** ແລ້ວກົດ **Approve** ເພື່ອເອົາເງິນເຂົ້າ Escrow.
4. **Venue Check-in & Complete:**  
   - ເມື່ອໄປຮອດຮ້ານ ທັງສອງກົດ Check-in.
   - ເມື່ອຈົບງານ ລູກຄ້າກົດ Complete -> ລະບົບຈຶ່ງປົດລັອກເງິນເຂົ້າ Wallet ຂອງ Companion (ຫັກຄ່າ Commission 15%).

---

## 🔑 ບັນຊີທົດສອບ (Demo Accounts)

### 1. ບັນຊີ Admin (ສໍາລັບເຂົ້າລະບົບ Web Portal ທີ່ port 3000):
- **ເບີໂທ:** `02099999999`
- **ລະຫັດຜ່ານ:** `admin123`

### 2. ບັນຊີ ລູກຄ້າ (Client - Somphone):
- **ເບີໂທ:** `02088888888`
- **ລະຫັດຜ່ານ:** `pass123`

### 3. ບັນຊີ ຄູ່ເດດ (Companion - Mina Keomany):
- **ເບີໂທ:** `02077777777`
- **ລະຫັດຜ່ານ:** `pass123`
*(ສາມາດສະຫຼັບບັນຊີໄດ້ທັນທີຢູ່ແຖບດ້ານເທິງຂອງ Mobile App)*

---

## 🚀 ວິທີການເປີດໃຊ້ງານ (How to Run)

### 1. ເປີດ Backend:
```bash
cd backend
npm run dev
```

### 2. ເປີດ Admin Web:
```bash
cd admin-web
npm run dev
```

### 3. ເປີດ Mobile App:
```bash
cd mobile-app
npm run dev
```
