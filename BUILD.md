# راهنمای Build برای Production

## مراحل Build و Deploy

### 1. نصب Dependencies
```bash
npm install
```

### 2. Build پروژه
```bash
npm run build
```
این دستور فایل‌های TypeScript را به JavaScript در پوشه `dist` کامپایل می‌کند.

### 3. اجرای Production
```bash
npm run start:prod
```

یا:
```bash
npm start
```

### 4. تنظیمات Environment Variables
قبل از اجرا، مطمئن شوید که فایل `.env` با متغیرهای زیر تنظیم شده است:

- `PORT`: پورت سرور (پیش‌فرض: 4002)
- `NODE_ENV`: باید `production` باشد
- `DATABASE_URL`: آدرس دیتابیس PostgreSQL
- `REDIS_URL`: آدرس Redis
- `SECRET_KEY`: کلید مخفی برای JWT
- `REFRESH_TOKEN_TIME`: زمان انقضای refresh token (به ثانیه)
- `GMAIL_USER`: ایمیل Gmail برای ارسال ایمیل
- `GMAIL_PASS`: رمز عبور Gmail
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID

### 5. Migration دیتابیس
```bash
npm run migrate
```

یا:
```bash
npm run push
```

## دستورات موجود

- `npm run dev`: اجرای در حالت development با nodemon
- `npm run build`: کامپایل TypeScript به JavaScript
- `npm start`: اجرای production build
- `npm run start:prod`: اجرای production با NODE_ENV=production
- `npm run generate`: تولید migration جدید
- `npm run migrate`: اجرای migration
- `npm run push`: push کردن schema به دیتابیس

## نکات مهم

1. در production، فایل `.env` باید به صورت دستی تنظیم شود
2. پوشه `dist` بعد از build ایجاد می‌شود و نباید در git commit شود
3. فایل‌های `uploads` و `order-files` باید در production موجود باشند
4. لاگ‌ها در پوشه `logs` ذخیره می‌شوند

