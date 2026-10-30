# راهنمای Build و اجرا

## اجرای با Docker (پیشنهادی)

از ریشه پروژه (`dental/`):

```bash
# مطمئن شوید dental_back_1/.env و متغیرهای IPPanel/JWT/… تنظیم شده‌اند
docker compose up --build
```

سرویس‌ها:

| سرویس | آدرس |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4002 |
| Swagger | http://localhost:4002/api-docs |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

منطقه پیش‌فرض `iran` است (ورود با SMS OTP). برای نسخه آلمان:

```bash
APP_REGION=germany docker compose up --build
```

و در فرانت `NEXT_PUBLIC_APP_REGION=germany` (از طریق build-arg در compose با همان `APP_REGION`).

Migration به‌صورت خودکار هنگام استارت backend اجرا می‌شود (`RUN_MIGRATIONS=true`).

## اجرای بدون Docker

### Backend (`dental_back_1`)

```bash
npm install   # یا pnpm install
# فایل .env را تنظیم کنید
npm run migrate
npm run dev          # development
npm run build && npm run start:prod   # production
```

متغیرهای مهم:

- `PORT` (پیش‌فرض: 4002)
- `DATABASE_URL`, `REDIS_URI`
- `SECRET_KEY`, `ACCESS_TOKEN_TIME`, `REFRESH_TOKEN_TIME`, `REFRESH_TOKEN_TIME_LONG`
- `APP_REGION` = `iran` | `germany`
- ایران: `IPPANEL_API_KEY`, `IPPANEL_FROM_NUMBER`, `AUTH_OTP_PATTERN`
- آلمان / ایمیل: `GMAIL_USER`, `GMAIL_PASS`, `GOOGLE_CLIENT_ID`
- `ZARINPAL_*`, `ALLOWED_ORIGINS`

### Frontend (`Dental_art`)

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm start
```

متغیرها:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_Image_URL`
- `NEXT_PUBLIC_APP_REGION` = `iran` | `germany`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (آلمان)

## دستورات Backend

- `npm run dev`: nodemon + ts-node
- `npm run build`: کامپایل TypeScript به `dist/`
- `npm start` / `npm run start:prod`: اجرای production
- `npm run generate` / `migrate` / `push`: Drizzle
- `npm run create-admin`: ساخت ادمین

## نکات

1. در production، env را از compose یا فایل روی سرور تزریق کنید.
2. پوشه‌های `uploads`، `order-files`، `order-pdfs`، `logs` در Docker به volume وصل می‌شوند.
3. پترن IPPanel باید در پنل تأیید شده باشد تا SMS OTP ارسال شود.
4. کلید API را در git commit نکنید.
