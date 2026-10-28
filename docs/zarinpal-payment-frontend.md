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

خروجی این آدرس JSON خود API است، نه صفحهٔ فرانت. نتیجه را با خواندن دوبارهٔ سفارش نشان دهید.

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
- `status === "payment"` و `payment.status !== "paid"`: دکمهٔ پرداخت یا تلاش مجدد
- `paymentstatus === true`: برچسب پرداخت‌شده؛ دکمهٔ پرداخت مخفی
- `status` از `check` به بعد: مراحل کار لابراتوار، نه صفحهٔ پرداخت

## مسیرهایی که نباید استفاده شوند

این دو هنوز وجود دارند و همیشه `400` با پیام `Receipt payment is disabled` برمی‌گردانند:

- `PUT /api/payment/payment/upload-file/:id`
- `PUT /api/payment/payment/accept/:id`

`POST /api/payment/payment` و `PUT /api/payment/payment/:id` اگر `status: "paid"` بفرستند رد می‌شوند. پرداخت‌شده فقط از مسیر زرین‌پال ساخته می‌شود. فرانت این دو مسیر را برای تسویه صدا نزند.

## کارهایی که فرانت نباید بکند

- آپلود رسید، کد پیگیری، یا انتظار برای قبول ادمین
- فرستادن `paymentstatus: true` در ساخت یا ویرایش سفارش
- بردن سفارش به `design` بلافاصله بعد از ثبت
- verify کردن `authority` در کلاینت
- فرض کردن اینکه خروج سفارش از `uploadfile` یعنی پرداخت شده
