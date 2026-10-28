# سفارش و پرداخت

سفارش لابراتوار دندان، از ثبت فایل بیمار تا تحویل، و تسویهٔ مبلغ همان سفارش.

## Language

**Order**:
یک کار لابراتوار برای یک بیمار، با مبلغ کل خودش.
_Avoid_: Purchase, case

**Payment**:
یک تسویهٔ زرین‌پال برای یک سفارش. هر سفارش فقط یک پرداخت دارد.
_Avoid_: Receipt, transaction, paypal

**Settlement**:
تأیید شدن پرداخت در زرین‌پال. بعد از آن سفارش پرداخت‌شده است و کار لابراتوار می‌تواند شروع شود.
_Avoid_: Admin approval, receipt acceptance

**Payable amount**:
مبلغ کل همان سفارش به تومان، که یک‌جا پرداخت می‌شود.
_Avoid_: Deposit, rial

**Payment stage**:
مرحله‌ای که سفارش منتظر پرداخت است و کار لابراتوار هنوز شروع نشده.
_Avoid_: Paid, paymentstatus

**Lab work**:
مراحل check، سپس design، سپس approval. این کارها فقط بعد از تسویه شروع می‌شوند و به تحویل نهایی می‌رسند.
_Avoid_: Payment stage
