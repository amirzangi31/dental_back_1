# مثال‌های JSON برای Postman - Dental Back API

## 🔐 Authentication

### 1. ارسال OTP به ایمیل
**POST** `/api/auth/sendemail`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "user@example.com"
}
```

---

### 2. تایید OTP
**POST** `/api/auth/verifyemail`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

---

### 3. ثبت‌نام (Signup)
**POST** `/api/auth/signup`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "sessionId": "session-id-from-verifyemail",
  "password": "password123",
  "name": "علی",
  "lastName": "احمدی",
  "country": "ایران",
  "postalcode": "1234567890",
  "phonenumber": "09123456789",
  "role": "user"
}
```

---

### 4. ورود (Signin)
**POST** `/api/auth/signin`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

### 5. Refresh Token
**POST** `/api/auth/refreshtoken`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "refreshToken": "refresh-token-from-signin"
}
```

---

## 👤 Users

### 6. دریافت اطلاعات کاربر
**GET** `/api/users/user`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 7. به‌روزرسانی اطلاعات کاربر
**PUT** `/api/users/user`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "name": "علی",
  "lastName": "احمدی",
  "speciality": "جراح دندان",
  "labratorName": "آزمایشگاه نمونه",
  "phonenumber": "09123456789",
  "country": "ایران",
  "postalcode": "1234567890"
}
```

---

## 📚 Catalog

### 8. دریافت لیست Catalog
**GET** `/api/catalog/catalogs`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 9. ایجاد Catalog جدید
**POST** `/api/catalog/catalog`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "کاتالوگ دندان مصنوعی"
}
```

---

### 10. به‌روزرسانی Catalog
**PUT** `/api/catalog/catalog/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "کاتالوگ به‌روز شده"
}
```

---

### 11. حذف Catalog
**DELETE** `/api/catalog/catalog/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📁 Category

### 12. دریافت لیست Category
**GET** `/api/category/categories`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 13. ایجاد Category جدید (با آپلود فایل)
**POST** `/api/category/category`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل]
title: "دندان مصنوعی"
description: "توضیحات category"
price: "150000.50"
catalog: "1"
```

**نکته:** در Postman، Body را روی `form-data` تنظیم کنید و فیلد `file` را از نوع `File` انتخاب کنید.

---

### 14. به‌روزرسانی Category (با آپلود فایل اختیاری)
**PUT** `/api/category/category/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل - اختیاری]
title: "عنوان به‌روز شده"
description: "توضیحات جدید"
price: "200000"
catalog: "2"
```

---

### 15. حذف Category
**DELETE** `/api/category/category/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📊 Volume

### 16. دریافت لیست Volume
**GET** `/api/volume/volumes`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 17. ایجاد Volume جدید
**POST** `/api/volume/volume`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "حجم 1-10",
  "start": "1.00",
  "end": "10.00",
  "price": "50000.00"
}
```

---

### 18. به‌روزرسانی Volume
**PUT** `/api/volume/volume/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "حجم به‌روز شده",
  "start": "5.00",
  "end": "15.00",
  "price": "75000.00"
}
```

---

### 19. حذف Volume
**DELETE** `/api/volume/volume/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🎨 MaterialShade

### 20. دریافت لیست MaterialShade
**GET** `/api/materialshade/materialshades`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 21. ایجاد MaterialShade جدید
**POST** `/api/materialshade/materialshade`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "Material Shade A1",
  "price": 50000,
  "category": "A",
  "color": 1
}
```

**نکته:** `category` باید یکی از مقادیر `"A"`, `"B"`, `"C"`, یا `"D"` باشد.

---

### 22. به‌روزرسانی MaterialShade
**PUT** `/api/materialshade/materialshade/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "Material Shade B2",
  "price": 60000,
  "category": "B",
  "color": 2
}
```

---

### 23. حذف MaterialShade
**DELETE** `/api/materialshade/materialshade/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🔧 ImplantAttribute

### 24. دریافت لیست ImplantAttribute
**GET** `/api/implantattribute/implantattributes`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 25. ایجاد ImplantAttribute جدید (با آپلود فایل)
**POST** `/api/implantattribute/implantattribute`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل]
title: "Implant Attribute 1"
price: "100000"
color: "2"
```

**نکته:** در Postman، Body را روی `form-data` تنظیم کنید و فیلد `file` را از نوع `File` انتخاب کنید.

---

### 26. به‌روزرسانی ImplantAttribute (با آپلود فایل اختیاری)
**PUT** `/api/implantattribute/implantattribute/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل - اختیاری]
title: "Implant Attribute به‌روز شده"
price: "150000"
color: "3"
```

---

### 27. حذف ImplantAttribute
**DELETE** `/api/implantattribute/implantattribute/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 💻 Device

### 28. دریافت لیست Device
**GET** `/api/device/devices`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 29. ایجاد Device جدید (با آپلود فایل)
**POST** `/api/device/device`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل]
title: "دستگاه اسکن دندان"
price: "200000"
```

---

### 30. به‌روزرسانی Device (با آپلود فایل اختیاری)
**PUT** `/api/device/device/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل - اختیاری]
title: "دستگاه به‌روز شده"
price: "250000"
```

---

### 31. حذف Device
**DELETE** `/api/device/device/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🔍 AdditionalScan

### 32. دریافت لیست AdditionalScan
**GET** `/api/additionalscan/additionalscans`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 33. ایجاد AdditionalScan جدید (با آپلود فایل)
**POST** `/api/additionalscan/additionalscan`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل]
title: "اسکن اضافی"
price: "30000"
color: "1"
```

---

### 34. به‌روزرسانی AdditionalScan (با آپلود فایل اختیاری)
**PUT** `/api/additionalscan/additionalscan/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (form-data):**
```
file: [انتخاب فایل - اختیاری]
title: "اسکن به‌روز شده"
price: "35000"
color: "2"
```

---

### 35. حذف AdditionalScan
**DELETE** `/api/additionalscan/additionalscan/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 🎨 Color

### 36. دریافت لیست Color
**GET** `/api/color/colors`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

### 37. ایجاد Color جدید
**POST** `/api/color/color`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "قرمز",
  "code": "#FF0000",
  "category": 1
}
```

---

### 38. به‌روزرسانی Color
**PUT** `/api/color/color/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "title": "قرمز تیره",
  "code": "#CC0000",
  "category": 1
}
```

---

### 39. حذف Color
**DELETE** `/api/color/color/:id`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📝 نکات مهم:

1. **Base URL:** `http://localhost:3000` (یا آدرس سرور شما)

2. **Authentication:** برای اکثر endpointها نیاز به `Authorization: Bearer YOUR_ACCESS_TOKEN` دارید که از endpoint `/api/auth/signin` یا `/api/auth/signup` دریافت می‌کنید.

3. **File Upload:** برای endpointهایی که فایل آپلود می‌کنند:
   - در Postman، Body را روی `form-data` تنظیم کنید
   - فیلد `file` را از نوع `File` انتخاب کنید
   - سایر فیلدها را به صورت `Text` وارد کنید

4. **Content-Type:**
   - برای JSON: `application/json`
   - برای form-data: Postman به صورت خودکار تنظیم می‌کند

5. **ID در URL:** در endpointهایی که `:id` دارند، عدد ID را جایگزین کنید. مثلاً `/api/catalog/catalog/1`

6. **Validation:** برخی فیلدها الزامی هستند. در صورت خطا، پیام خطا را بررسی کنید.

