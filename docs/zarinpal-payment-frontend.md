# پرداخت زرین‌پال — راهنمای فرانت

پرداخت فقط با زرین‌پال است. آپلود فیش و تأیید ادمین دیگر سفارش را پرداخت‌شده نمی‌کند. مبلغ، کل `totalaprice` همان سفارش است و واحدش تومان است. سفارش مرجع سفارش جداست و مبلغ خودش را دارد.

همهٔ مسیرهای زیر زیر `/api` هستند. احراز هویت با هدر `Authorization: Bearer <token>` است، مگر جایی که خلاف آن نوشته شده.

شکل پاسخ موفق:

```json
{
  "status": 200,
  "success": true,
  "data": {},
  "resultMessage": "..."
}
```

شکل پاسخ خطا:

```json
{
  "status": 400,
  "success": false,
  "error": "...",
  "data": null
}
```

## ترتیب وضعیت سفارش

```text
uploadfile → payment → check → design → approval → finaldelivery
```

| وضعیت | معنی برای UI |
| --- | --- |
| `uploadfile` | فایل سفارش ثبت شده و هنوز برای پرداخت فرستاده نشده. دکمهٔ پرداخت نشان داده نشود. |
| `payment` | منتظر پرداخت. فقط در این وضعیت دکمهٔ پرداخت زرین‌پال فعال است. |
| `check` | پرداخت تأیید شده و کار لابراتوار شروع شده. |
| `design` | در حال طراحی. |
| `approval` | در انتظار تأیید. |
| `finaldelivery` | تحویل نهایی. |

`payment` یعنی «منتظر پرداخت»، نه «پرداخت شده».

سفارش وقتی پرداخت‌شده است که هر دو این‌ها برقرار باشد:

- `orders.paymentstatus === true`
- `payment.status === "paid"`

بعد از پرداخت موفق، بک‌اند خودش وضعیت سفارش را به `check` می‌برد. فرانت این وضعیت را عوض نکند و `paymentstatus` را هم نفرستد.

مراحل `check`، `design`، `approval` و `finaldelivery` قبل از پرداخت رد می‌شوند.

## کاری که فرانت انجام می‌دهد

1. کاربر سفارش را می‌سازد. وضعیت `uploadfile` است و `payment` برابر `null` است.
2. کاربر سفارش را ثبت می‌کند. وضعیت می‌شود `payment` و یک ردیف پرداخت `pending` برمی‌گردد.
3. در صفحهٔ پرداخت، `POST /api/payment/zarinpal/request/:orderId` زده می‌شود.
4. مرورگر به `data.url` هدایت می‌شود (درگاه زرین‌پال).
5. بعد از پرداخت، زرین‌پال مرورگر را به callback بک‌اند می‌فرستد. فرانت verify نمی‌زند.
6. برای نشان دادن نتیجه، سفارش را دوباره بخوانید. اگر `paymentstatus` روشن و `status` برابر `check` باشد، پرداخت موفق بوده است.

## ساخت سفارش

`POST /api/order/order`  
`POST /api/order/order/:id/with-reference`

دیگر ردیف پرداخت ساخته نمی‌شود. در پاسخ، `payment` برابر `null` است. `paymentstatus` همیشه `false` است، حتی اگر در بدنه فرستاده شود.

## ثبت سفارش و ورود به پرداخت

`PUT /api/order/submitorderwithuser/:id`  
احراز هویت لازم است. بدنه مثل قبل می‌تواند `vip` و `comment` و فایل داشته باشد.

فقط وقتی وضعیت فعلی `uploadfile` است کار می‌کند. بعد از موفقیت وضعیت سفارش `payment` می‌شود و `paymentstatus` روشن نمی‌شود.

`data.payment` ردیف پرداخت است:

```json
{
  "id": 1,
  "order_id": 10,
  "status": "pending",
  "type": "zarinpal",
  "isAccepted": false,
  "authority": null,
  "refId": null,
  "amount": null
}
```

خطاهای مهم:

| وضعیت | پیام |
| --- | --- |
| 400 | `Order cannot be submitted in this status` |
| 400 | `Order is already paid` |
| 403 | کاربر صاحب سفارش نیست |
| 404 | سفارش پیدا نشد |

## شروع پرداخت

`POST /api/payment/zarinpal/request/:orderId`  
احراز هویت لازم است. بدنه ندارد.

شرایط قبول درخواست:

- کاربر صاحب سفارش باشد
- وضعیت سفارش `payment` باشد
- سفارش هنوز پرداخت نشده باشد
- مبلغ گردشدهٔ `totalaprice` حداقل ۱۰۰۰ تومان باشد

پاسخ موفق (`data`):

```json
{
  "authority": "A00000000000000000000000000000000000",
  "amount": 150000,
  "url": "https://sandbox.zarinpal.com/pg/StartPay/A000...",
  "payment": {
    "id": 1,
    "order_id": 10,
    "status": "pending",
    "type": "zarinpal",
    "isAccepted": false,
    "authority": "A000...",
    "amount": 150000,
    "refId": null
  }
}
```

`amount` تومانِ صحیح است، نه ریال. فرانت کاربر را به `url` بفرستد. این آدرس را ذخیره یا دوباره نسازید؛ هر بار شروع پرداخت، `authority` جدید می‌دهد.

اگر پرداخت قبلی `failed` شده باشد، همان ردیف دوباره استفاده می‌شود. دکمهٔ تلاش مجدد همان همین درخواست است.

خطاهای مهم:

| وضعیت | پیام |
| --- | --- |
| 400 | `Order is not awaiting payment` |
| 400 | `Order is already paid` |
| 400 | `Payable amount must be at least 1000 toman` |
| 403 | `You are not authorized to pay this order` |
| 404 | `Order not found` |
| 502 | درگاه در دسترس نیست یا تنظیم نشده |

## برگشت از درگاه

این مسیر را فرانت صدا نمی‌زند. زرین‌پال مرورگر کاربر را به آن می‌فرستد:

`GET /api/payment/zarinpal/callback?Authority=...&Status=OK`

بک‌اند پرداخت را verify می‌کند.

- موفق: `payment.status = paid`، `isAccepted = true`، `refId` پر می‌شود، `paymentstatus = true`، وضعیت سفارش `check`.
- انصراف یا `Status` غیر از `OK`: همان ردیف `failed` می‌شود و سفارش روی `payment` می‌ماند.
- اگر همان پرداخت قبلاً settle شده باشد، وضعیت سفارش دوباره عوض نمی‌شود.

بعد از verify، بک‌اند به‌جای JSON مرورگر را با ریدایرکت ۳۰۲ به `PAYMENT_RETURN_URL` می‌فرستد. اگر این متغیر نباشد، مقصد `https://app.digitda.ir/` است. موفق، تکراری، انصراف و خطا همه به همین آدرس برمی‌گردند. نتیجهٔ پرداخت را با خواندن دوبارهٔ سفارش نشان دهید.

## تشخیص وضعیت در لیست سفارش

`GET /api/order/orderlist`

فیلتر اختیاری: `?paymentStatus=pending|paid|failed`

روی هر آیتم:

```json
{
  "status": "payment",
  "paymentstatus": false,
  "totalaprice": "150000.00",
  "payment": {
    "id": 1,
    "status": "pending",
    "isAccepted": false,
    "type": "zarinpal",
    "trackingCode": null
  }
}
```

`payment` در لیست مبلغ، `authority` و `refId` را ندارد. برای مبلغ پرداخت‌شده، `totalaprice` سفارش کافی است. `payment.status` یکی از `pending`، `paid`، `failed` است.

پیشنهاد نمایش:

- `status === "uploadfile"`: دکمهٔ ثبت برای پرداخت
- `status === "payment"` و `payment.status !== "paid"`: دکمهٔ پرداخت زرین‌پال، و اگر موجودی کیف پول به اندازهٔ مبلغ سفارش باشد دکمهٔ پرداخت از کیف پول
- `paymentstatus === true`: برچسب پرداخت‌شده؛ دکمهٔ پرداخت مخفی
- `status` از `check` به بعد: مراحل کار لابراتوار، نه صفحهٔ پرداخت

## کیف پول

هر کاربر یک موجودی به تومان دارد. شارژ با همان زرین‌پال است و سفارش را پرداخت نمی‌کند. پرداخت سفارش از موجودی فقط وقتی کامل است که موجودی به اندازهٔ کل مبلغ سفارش باشد. کمتر از آن، دکمهٔ زرین‌پال سر جایش می‌ماند.

`GET /api/wallet`  
احراز هویت لازم است. اگر کیف پول نباشد با موجودی صفر ساخته می‌شود. صفحهٔ دفتر با `page`، `limit` و `sort` است.

`data`:

```json
{
  "balance": 50000,
  "entries": [
    {
      "id": 1,
      "kind": "topup",
      "status": "paid",
      "amountToman": 50000,
      "note": null,
      "orderId": null,
      "refId": "12345",
      "createdAt": "2026-11-22T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

`kind` یکی از `topup`، `order` و `admin` است. `admin` افزایش موجودی توسط مدیر است و سفارش را پرداخت نمی‌کند. `note` توضیح اختیاری همان افزایش است و برای شارژ درگاه و پرداخت سفارش `null` است. `status` یکی از `pending`، `paid` و `failed` است.

## افزایش موجودی توسط مدیر

`POST /api/wallet/admin/credit`  
فقط ادمین. بدنه: `{ "userId": 12, "amount": 250000, "note": "اصلاح موجودی" }`. `amount` عدد صحیح و حداقل ۱ تومان است. `note` اختیاری و حداکثر ۲۰۰ نویسه است. حداقل ۱۰۰۰۰۰ تومانِ شارژ کاربر اینجا اعمال نمی‌شود.

اگر کاربر کیف پول نداشته باشد ساخته می‌شود. موجودی همان لحظه زیاد می‌شود و یک ردیف `kind: "admin"` با `status: "paid"` در گردش ثبت می‌شود. پاسخ موفق (`data`): `balance`، `amount` و `entry`.

| وضعیت | پیام |
| --- | --- |
| 400 | اعتبارسنجی مبلغ یا شناسه، یا `Amount is too large` |
| 403 | `You do not have permission to perform this action.` |
| 404 | `User not found` |

## شارژ کیف پول

`POST /api/wallet/topup`  
بدنه: `{ "amount": 100000 }`. مبلغ عدد صحیح و حداقل ۱۰۰۰۰۰ تومان است.

پاسخ موفق (`data`): `authority`، `amount`، `url` و `entry`. فرانت کاربر را به `url` می‌فرستد. verify در کلاینت زده نمی‌شود.

برگشت از درگاه همان callback پرداخت سفارش است. بک‌اند اگر `authority` متعلق به شارژ باشد موجودی را یک‌بار زیاد می‌کند و مرورگر را به `/dashboard/wallet?topup=paid|failed|pending` روی مبدأ `PAYMENT_RETURN_URL` می‌فرستد. `topup` فقط برای پیام است. موجودی را با `GET /api/wallet` بخوانید.

خطاهای مهم شارژ:

| وضعیت | پیام |
| --- | --- |
| 400 | `Payable amount must be at least 100000 toman` |
| 502 | درگاه در دسترس نیست یا تنظیم نشده |

## پرداخت سفارش از موجودی

`POST /api/payment/wallet/:orderId`  
بدنه ندارد. شرط‌ها همان شروع پرداخت زرین‌پال است: صاحب سفارش، وضعیت `payment`، پرداخت‌نشده، مبلغ حداقل ۱۰۰۰ تومان.

اگر موجودی کافی باشد سفارش همان‌جا تسویه می‌شود: `payment.type` برابر `wallet`، `payment.status` برابر `paid`، `paymentstatus` روشن، وضعیت سفارش `check`، و فاکتور صادر می‌شود. به درگاه نروید. موجودی و لیست پرداخت را دوباره بخوانید.

اگر موجودی کافی نباشد `400` با پیام `Wallet balance is not enough` برمی‌گردد و هیچ مبلغی کم نمی‌شود. دکمهٔ زرین‌پال را نشان بدهید.

بقیهٔ خطاها همان شروع پرداخت زرین‌پال است: سفارش در انتظار پرداخت نیست، قبلاً پرداخت شده، مبلغ کمتر از ۱۰۰۰ تومان، صاحب سفارش نیست، یا سفارش پیدا نشد.

## مسیرهایی که نباید استفاده شوند

این دو هنوز وجود دارند و همیشه `400` با پیام `Receipt payment is disabled` برمی‌گردانند:

- `PUT /api/payment/payment/upload-file/:id`
- `PUT /api/payment/payment/accept/:id`

`POST /api/payment/payment` و `PUT /api/payment/payment/:id` اگر `status: "paid"` بفرستند رد می‌شوند. پرداخت‌شده فقط از زرین‌پال یا از موجودی کیف پول ساخته می‌شود. فرانت این دو مسیر را برای تسویه صدا نزند.

## کارهایی که فرانت نباید بکند

- آپلود رسید، کد پیگیری، یا انتظار برای قبول ادمین
- فرستادن `paymentstatus: true` در ساخت یا ویرایش سفارش
- بردن سفارش به `design` بلافاصله بعد از ثبت
- verify کردن `authority` در کلاینت
- فرض کردن اینکه خروج سفارش از `uploadfile` یعنی پرداخت شده
