import { AppLanguage } from "../config/language";

export type LocalizedText = Record<AppLanguage, string>;

export const MESSAGES = {
  INTERNAL_SERVER_ERROR: {
    fa: "خطای داخلی سرور",
    en: "Internal server error",
    de: "Interner Serverfehler",
  },
  VALIDATION_ERROR: {
    fa: "خطای اعتبارسنجی",
    en: "Validation Error",
    de: "Validierungsfehler",
  },
  AN_ERROR_OCCURRED: {
    fa: "خطایی رخ داده است",
    en: "An error has occurred.",
    de: "Ein Fehler ist aufgetreten.",
  },
  FILE_REQUIRED: {
    fa: "فایل الزامی است",
    en: "File is required",
    de: "Datei ist erforderlich",
  },
  INVALID_CATEGORY_ID: {
    fa: "شناسه دسته‌بندی نامعتبر است",
    en: "Invalid category ID",
    de: "Ungültige Kategorie-ID",
  },
  INVALID_MATERIAL_ID: {
    fa: "شناسه متریال نامعتبر است",
    en: "Invalid material ID",
    de: "Ungültige Material-ID",
  },
  INVALID_ORDER_DATA: {
    fa: "داده‌های سفارش نامعتبر است",
    en: "Invalid order data",
    de: "Ungültige Bestelldaten",
  },
  INVALID_JSON_BODY: {
    fa: "بدنه JSON نامعتبر است",
    en: "Invalid JSON body",
    de: "Ungültiger JSON-Body",
  },

  PLEASE_LOGIN_AGAIN: {
    fa: "لطفاً دوباره وارد شوید",
    en: "Please log in again",
    de: "Bitte melden Sie sich erneut an",
  },
  TOKEN_EXPIRED: {
    fa: "لطفاً دوباره وارد شوید. توکن منقضی شده است",
    en: "Please log in again. Token is expired",
    de: "Bitte melden Sie sich erneut an. Token ist abgelaufen",
  },
  INVALID_TOKEN: {
    fa: "توکن نامعتبر است",
    en: "Invalid token",
    de: "Ungültiges Token",
  },
  TOKEN_INVALID_OR_EXPIRED: {
    fa: "توکن نامعتبر یا منقضی شده است",
    en: "token is invalid or expired",
    de: "Token ist ungültig oder abgelaufen",
  },
  ADMIN_PERMISSION_DENIED: {
    fa: "شما مجوز انجام این عملیات را ندارید",
    en: "You do not have permission to perform this action.",
    de: "Sie haben keine Berechtigung, diese Aktion auszuführen.",
  },

  OTP_EXPIRED_OR_NOT_FOUND: {
    fa: "کد تأیید منقضی شده یا یافت نشد",
    en: "OTP expired or not found",
    de: "OTP abgelaufen oder nicht gefunden",
  },
  INVALID_OTP: {
    fa: "کد تأیید نامعتبر است",
    en: "Invalid OTP",
    de: "Ungültiges OTP",
  },
  SESSION_ID_EXPIRED: {
    fa: "شناسه نشست منقضی شده یا یافت نشد",
    en: "sessionId is expired or not found",
    de: "Sitzungs-ID abgelaufen oder nicht gefunden",
  },
  SESSION_ID_INVALID: {
    fa: "شناسه نشست نامعتبر یا منقضی شده است",
    en: "sessionId is invalid or expired",
    de: "Sitzungs-ID ungültig oder abgelaufen",
  },
  PASSWORD_REQUIRED: {
    fa: "رمز عبور الزامی است",
    en: "Password is required",
    de: "Passwort ist erforderlich",
  },
  PASSWORD_OR_EMAIL_INCORRECT: {
    fa: "رمز عبور یا ایمیل اشتباه است",
    en: "Password Or Email is incorrect",
    de: "Passwort oder E-Mail ist falsch",
  },
  GOOGLE_ID_TOKEN_REQUIRED: {
    fa: "توکن Google ID الزامی است",
    en: "Google ID token is required",
    de: "Google-ID-Token ist erforderlich",
  },
  GOOGLE_OAUTH_NOT_CONFIGURED: {
    fa: "Google OAuth پیکربندی نشده است",
    en: "Google OAuth is not configured",
    de: "Google OAuth ist nicht konfiguriert",
  },
  INVALID_GOOGLE_TOKEN: {
    fa: "توکن Google نامعتبر است",
    en: "Invalid Google token payload",
    de: "Ungültige Google-Token-Nutzlast",
  },
  EMAIL_ALREADY_EXISTS: {
    fa: "این ایمیل قبلاً ثبت شده است",
    en: "Email already exists",
    de: "E-Mail existiert bereits",
  },
  USER_ALREADY_EXISTS: {
    fa: "کاربر از قبل وجود دارد",
    en: "User already exists",
    de: "Benutzer existiert bereits",
  },
  USER_ALREADY_EXISTS_DETAILS: {
    fa: "کاربری قبلاً با این مشخصات ثبت‌نام شده است",
    en: "A user with these details already exists",
    de: "Ein Benutzer mit diesen Daten existiert bereits",
  },
  USER_IS_DELETED: {
    fa: "کاربر حذف شده است",
    en: "User is deleted",
    de: "Benutzer ist gelöscht",
  },
  USER_NOT_FOUND: {
    fa: "کاربر یافت نشد",
    en: "User not found",
    de: "Benutzer nicht gefunden",
  },
  USER_NOT_FOUND_SIGNUP: {
    fa: "کاربر یافت نشد. لطفاً ابتدا ثبت‌نام کنید",
    en: "User not found. Please sign up first or use the signup endpoint",
    de: "Benutzer nicht gefunden. Bitte registrieren Sie sich zuerst",
  },
  EMAIL_SENT: {
    fa: "ایمیل با موفقیت ارسال شد",
    en: "email sent successfully",
    de: "E-Mail erfolgreich gesendet",
  },
  EMAIL_VERIFIED: {
    fa: "ایمیل با موفقیت تأیید شد",
    en: "email verified successfully",
    de: "E-Mail erfolgreich verifiziert",
  },
  USER_CREATED: {
    fa: "کاربر با موفقیت ایجاد شد",
    en: "user created successfully",
    de: "Benutzer erfolgreich erstellt",
  },
  USER_FETCHED: {
    fa: "کاربر با موفقیت دریافت شد",
    en: "User fetched successfully",
    de: "Benutzer erfolgreich abgerufen",
  },
  USER_UPDATED: {
    fa: "کاربر با موفقیت به‌روزرسانی شد",
    en: "User updated successfully",
    de: "Benutzer erfolgreich aktualisiert",
  },
  USER_DELETED: {
    fa: "کاربر با موفقیت حذف شد",
    en: "User deleted successfully",
    de: "Benutzer erfolgreich gelöscht",
  },
  USER_LOGGED_OUT: {
    fa: "خروج با موفقیت انجام شد",
    en: "User logged out successfully",
    de: "Benutzer erfolgreich abgemeldet",
  },
  USER_SIGNED_IN: {
    fa: "ورود با موفقیت انجام شد",
    en: "User signed in successfully",
    de: "Benutzer erfolgreich angemeldet",
  },
  USER_SIGNED_IN_GOOGLE: {
    fa: "ورود با Google با موفقیت انجام شد",
    en: "User signed in successfully with Google",
    de: "Benutzer erfolgreich mit Google angemeldet",
  },
  PASSWORD_RESET_SUCCESS: {
    fa: "رمز عبور با موفقیت بازنشانی شد",
    en: "Password reset successfully",
    de: "Passwort erfolgreich zurückgesetzt",
  },
  USER_UPDATE_UNAUTHORIZED: {
    fa: "شما مجاز به به‌روزرسانی این کاربر نیستید",
    en: "You are not authorized to update this user",
    de: "Sie sind nicht berechtigt, diesen Benutzer zu aktualisieren",
  },
  USERS_LIST_FETCHED: {
    fa: "لیست کاربران با موفقیت دریافت شد",
    en: "users list fetched successfully",
    de: "Benutzerliste erfolgreich abgerufen",
  },

  DESIGNER_CREATED: {
    fa: "طراح با موفقیت ایجاد شد",
    en: "Designer created successfully",
    de: "Designer erfolgreich erstellt",
  },
  DESIGNER_UPDATED: {
    fa: "طراح با موفقیت به‌روزرسانی شد",
    en: "Designer updated successfully",
    de: "Designer erfolgreich aktualisiert",
  },
  DESIGNER_DELETE_SUCCESS: {
    fa: "طراح با موفقیت حذف شد",
    en: "Designer deleted successfully",
    de: "Designer erfolgreich gelöscht",
  },
  DESIGNER_FETCHED: {
    fa: "طراح با موفقیت دریافت شد",
    en: "Designer fetched successfully",
    de: "Designer erfolgreich abgerufen",
  },
  DESIGNERS_FETCHED: {
    fa: "طراحان با موفقیت دریافت شدند",
    en: "Designers fetched successfully",
    de: "Designer erfolgreich abgerufen",
  },
  DESIGNER_NOT_FOUND: {
    fa: "طراح یافت نشد",
    en: "Designer not found",
    de: "Designer nicht gefunden",
  },
  DESIGNER_ID_REQUIRED: {
    fa: "شناسه طراح الزامی است",
    en: "Designer ID is required",
    de: "Designer-ID ist erforderlich",
  },
  DESIGNER_IS_DELETED: {
    fa: "طراح حذف شده است",
    en: "Designer is deleted",
    de: "Designer ist gelöscht",
  },
  USER_IS_NOT_DESIGNER: {
    fa: "کاربر طراح نیست",
    en: "User is not a designer",
    de: "Benutzer ist kein Designer",
  },

  ORDER_NOT_FOUND: {
    fa: "سفارش یافت نشد",
    en: "Order not found",
    de: "Bestellung nicht gefunden",
  },
  ORDER_CREATED: {
    fa: "سفارش با موفقیت ایجاد شد",
    en: "Order created successfully",
    de: "Bestellung erfolgreich erstellt",
  },
  ORDER_CREATED_WITH_REFERENCE: {
    fa: "سفارش با مرجع با موفقیت ایجاد شد",
    en: "Order created successfully with reference",
    de: "Bestellung mit Referenz erfolgreich erstellt",
  },
  ORDER_FETCHED: {
    fa: "سفارش با موفقیت دریافت شد",
    en: "Order fetched successfully",
    de: "Bestellung erfolgreich abgerufen",
  },
  ORDER_UPDATED: {
    fa: "سفارش با موفقیت به‌روزرسانی شد",
    en: "Order updated successfully",
    de: "Bestellung erfolgreich aktualisiert",
  },
  ORDER_SUBMITTED: {
    fa: "سفارش با موفقیت ثبت شد",
    en: "Order submitted successfully",
    de: "Bestellung erfolgreich eingereicht",
  },
  ORDER_ALREADY_PAID: {
    fa: "سفارش قبلاً پرداخت شده است",
    en: "Order is already paid",
    de: "Bestellung ist bereits bezahlt",
  },
  ORDERS_FETCHED: {
    fa: "سفارش‌ها با موفقیت دریافت شدند",
    en: "Orders fetched successfully",
    de: "Bestellungen erfolgreich abgerufen",
  },
  ORDER_STATUS_CHANGED: {
    fa: "وضعیت سفارش با موفقیت تغییر کرد",
    en: "Order status changed successfully",
    de: "Bestellstatus erfolgreich geändert",
  },
  ORDER_ASSIGNED_TO_DESIGNER: {
    fa: "سفارش با موفقیت به طراح اختصاص یافت",
    en: "Order assigned to designer successfully",
    de: "Bestellung erfolgreich dem Designer zugewiesen",
  },
  SEND_FILE_SUCCESS: {
    fa: "فایل با موفقیت ارسال شد",
    en: "Send File successfully",
    de: "Datei erfolgreich gesendet",
  },
  CATEGORY_TEETH_MISMATCH: {
    fa: "دسته‌بندی یا دندان‌ها با سفارش اصلی مطابقت ندارند",
    en: "Category or teeth do not match the original order",
    de: "Kategorie oder Zähne stimmen nicht mit der ursprünglichen Bestellung überein",
  },
  TITLE_REQUIRED: {
    fa: "عنوان الزامی است",
    en: "Title is required",
    de: "Titel ist erforderlich",
  },
  PATH_NOT_FOUND: {
    fa: "مسیر یافت نشد. لطفاً مسیر و متد را بررسی کنید",
    en: "404! Path Not Found. Please check the path/method",
    de: "404! Pfad nicht gefunden. Bitte Pfad und Methode prüfen",
  },
  RATE_LIMIT_EXCEEDED: {
    fa: "درخواست‌های زیادی از این IP ارسال شده است. لطفاً بعداً تلاش کنید",
    en: "Too many requests from this IP, please try again later.",
    de: "Zu viele Anfragen von dieser IP, bitte später erneut versuchen.",
  },
  PRICE_CALCULATED: {
    fa: "قیمت با موفقیت محاسبه شد",
    en: "Price calculated successfully",
    de: "Preis erfolgreich berechnet",
  },
  ORDER_UNAUTHORIZED: {
    fa: "شما مجاز به دسترسی به این سفارش نیستید",
    en: "You are not authorized to access this order",
    de: "Sie sind nicht berechtigt, auf diese Bestellung zuzugreifen",
  },
  ORDER_UPDATE_UNAUTHORIZED: {
    fa: "شما مجاز به به‌روزرسانی این سفارش نیستید",
    en: "You are not authorized to update this order",
    de: "Sie sind nicht berechtigt, diese Bestellung zu aktualisieren",
  },
  ORDER_SUBMIT_UNAUTHORIZED: {
    fa: "شما مجاز به ثبت این سفارش نیستید",
    en: "You are not authorized to submit this order",
    de: "Sie sind nicht berechtigt, diese Bestellung einzureichen",
  },
  ORDER_DOWNLOAD_UNAUTHORIZED: {
    fa: "شما مجاز به دانلود این فایل نیستید",
    en: "You are not authorized to download this file",
    de: "Sie sind nicht berechtigt, diese Datei herunterzuladen",
  },
  RESOURCE_ACCESS_UNAUTHORIZED: {
    fa: "شما مجاز به دسترسی به این منبع نیستید",
    en: "You are not authorized to access this resource",
    de: "Sie sind nicht berechtigt, auf diese Ressource zuzugreifen",
  },
  PERFORM_ACTION_UNAUTHORIZED: {
    fa: "شما مجاز به انجام این عملیات نیستید",
    en: "You are not authorized to perform this action",
    de: "Sie sind nicht berechtigt, diese Aktion auszuführen",
  },
  TEETH_NOT_FOUND: {
    fa: "دندان‌ها یافت نشد",
    en: "Teeth not found",
    de: "Zähne nicht gefunden",
  },
  NO_TEETH_FOUND: {
    fa: "دندانی برای این سفارش یافت نشد",
    en: "No teeth found for this order",
    de: "Keine Zähne für diese Bestellung gefunden",
  },
  AT_LEAST_ONE_TOOTH: {
    fa: "حداقل یک دندان باید انتخاب شود",
    en: "At least one tooth must be selected",
    de: "Mindestens ein Zahn muss ausgewählt werden",
  },
  TEETH_COUNT_MISMATCH: {
    fa: "تعداد دندان‌ها باید با سفارش اصلی یکسان باشد",
    en: "The number of teeth must match the original order",
    de: "Die Anzahl der Zähne muss mit der ursprünglichen Bestellung übereinstimmen",
  },
  NO_MATERIAL_FILES: {
    fa: "فایل متریالی برای این سفارش یافت نشد",
    en: "No material files found for this order",
    de: "Keine Materialdateien für diese Bestellung gefunden",
  },
  NO_VALID_IMAGES: {
    fa: "تصویر معتبری برای ساخت PDF یافت نشد",
    en: "No valid image files found to create PDF",
    de: "Keine gültigen Bilddateien zum Erstellen der PDF gefunden",
  },
  FILE_DOWNLOAD_ERROR: {
    fa: "خطا در دانلود فایل",
    en: "Error in file download",
    de: "Fehler beim Herunterladen der Datei",
  },
  ADMIN_FILE_NOT_FOUND: {
    fa: "فایل ادمین یافت نشد",
    en: "Admin file not found",
    de: "Admin-Datei nicht gefunden",
  },
  ADMIN_FILE_NOT_FOUND_FOR_ORDER: {
    fa: "فایل ادمین برای این سفارش یافت نشد",
    en: "Admin file not found for this order",
    de: "Admin-Datei für diese Bestellung nicht gefunden",
  },
  VIP_PRICE_NOT_FOUND: {
    fa: "قیمت VIP یافت نشد",
    en: "VIP price not found",
    de: "VIP-Preis nicht gefunden",
  },
  LIST_FETCHED: {
    fa: "لیست با موفقیت دریافت شد",
    en: "list fetched successfully",
    de: "Liste erfolgreich abgerufen",
  },

  PAYMENT_NOT_FOUND: {
    fa: "پرداخت یافت نشد",
    en: "Payment not found",
    de: "Zahlung nicht gefunden",
  },
  PAYMENTS_FETCHED: {
    fa: "پرداخت‌ها با موفقیت دریافت شدند",
    en: "Payments fetched successfully",
    de: "Zahlungen erfolgreich abgerufen",
  },
  PAYMENT_FETCHED: {
    fa: "پرداخت با موفقیت دریافت شد",
    en: "Payment fetched successfully",
    de: "Zahlung erfolgreich abgerufen",
  },
  PAYMENT_CREATED: {
    fa: "پرداخت با موفقیت ایجاد شد",
    en: "Payment created successfully",
    de: "Zahlung erfolgreich erstellt",
  },
  PAYMENT_UPDATED: {
    fa: "پرداخت با موفقیت به‌روزرسانی شد",
    en: "Payment updated successfully",
    de: "Zahlung erfolgreich aktualisiert",
  },
  PAYMENT_DELETED: {
    fa: "پرداخت با موفقیت حذف شد",
    en: "Payment deleted successfully",
    de: "Zahlung erfolgreich gelöscht",
  },
  PAYMENT_ALREADY_EXISTS: {
    fa: "پرداخت از قبل وجود دارد",
    en: "Payment already exists",
    de: "Zahlung existiert bereits",
  },
  PAYMENT_ACCEPTED: {
    fa: "پرداخت با موفقیت تأیید شد",
    en: "Payment accepted successfully",
    de: "Zahlung erfolgreich akzeptiert",
  },
  TRACKING_CODE_REQUIRED: {
    fa: "کد رهگیری الزامی است",
    en: "Tracking code is required",
    de: "Tracking-Code ist erforderlich",
  },
  PAYMENT_ID_REQUIRED: {
    fa: "شناسه پرداخت الزامی است",
    en: "Payment id is required",
    de: "Zahlungs-ID ist erforderlich",
  },
  PAYMENT_UPLOAD_UNAUTHORIZED: {
    fa: "شما مجاز به آپلود فایل برای این پرداخت نیستید",
    en: "You are not authorized to upload file for this payment",
    de: "Sie sind nicht berechtigt, eine Datei für diese Zahlung hochzuladen",
  },
  PAYMENT_ACCEPT_UNAUTHORIZED: {
    fa: "شما مجاز به تأیید این پرداخت نیستید",
    en: "You are not authorized to accept this payment",
    de: "Sie sind nicht berechtigt, diese Zahlung zu akzeptieren",
  },
  FILE_UPLOADED: {
    fa: "فایل با موفقیت آپلود شد",
    en: "File uploaded successfully",
    de: "Datei erfolgreich hochgeladen",
  },

  UPLOAD_ERROR: {
    fa: "خطا در آپلود فایل",
    en: "Upload error",
    de: "Fehler beim Hochladen der Datei",
  },
  FILE_SIZE_EXCEEDED_10MB: {
    fa: "حجم فایل بیش از حد مجاز است (حداکثر 10MB)",
    en: "File size exceeds limit (max 10MB)",
    de: "Dateigröße überschreitet das Limit (max. 10MB)",
  },
  FILE_SIZE_EXCEEDED_50MB: {
    fa: "حجم فایل بیش از حد مجاز است (حداکثر 50MB)",
    en: "File size exceeds limit (max 50MB)",
    de: "Dateigröße überschreitet das Limit (max. 50MB)",
  },
  FILE_TYPE_NOT_ALLOWED: {
    fa: "نوع فایل مجاز نیست",
    en: "File type not allowed",
    de: "Dateityp nicht erlaubt",
  },
  ORDER_DATA_PARSE_ERROR: {
    fa: "خطا در پردازش داده‌های سفارش",
    en: "Error parsing order data",
    de: "Fehler beim Verarbeiten der Bestelldaten",
  },

  TICKET_NOT_FOUND: {
    fa: "تیکت یافت نشد",
    en: "Ticket not found",
    de: "Ticket nicht gefunden",
  },
  TICKET_NOT_FOUND_LOWER: {
    fa: "تیکت یافت نشد",
    en: "ticket is not found",
    de: "Ticket nicht gefunden",
  },
  TICKETS_FETCHED: {
    fa: "تیکت‌ها با موفقیت دریافت شدند",
    en: "Tickets fetched successfully",
    de: "Tickets erfolgreich abgerufen",
  },
  TICKET_FETCHED: {
    fa: "تیکت با موفقیت دریافت شد",
    en: "Ticket fetched successfully",
    de: "Ticket erfolgreich abgerufen",
  },
  TICKET_CREATED: {
    fa: "تیکت با موفقیت ایجاد شد",
    en: "Ticket created successfully",
    de: "Ticket erfolgreich erstellt",
  },
  TICKET_UPDATED: {
    fa: "تیکت با موفقیت به‌روزرسانی شد",
    en: "Ticket updated successfully",
    de: "Ticket erfolgreich aktualisiert",
  },
  TICKET_DELETED: {
    fa: "تیکت با موفقیت حذف شد",
    en: "Ticket deleted successfully",
    de: "Ticket erfolgreich gelöscht",
  },
  TICKET_VIEW_UNAUTHORIZED: {
    fa: "شما مجاز به مشاهده این تیکت نیستید",
    en: "You are not authorized to view this ticket",
    de: "Sie sind nicht berechtigt, dieses Ticket anzusehen",
  },
  TICKET_ORDER_NOT_FOUND: {
    fa: "این سفارش یافت نشد",
    en: "This order is not found",
    de: "Diese Bestellung wurde nicht gefunden",
  },
  ORDER_HAS_REPORT: {
    fa: "این سفارش گزارش دارد",
    en: "This order has report",
    de: "Diese Bestellung hat einen Bericht",
  },
  TICKET_CREATE_UNAUTHORIZED: {
    fa: "شما مجاز به ایجاد تیکت برای این سفارش نیستید",
    en: "You are not authorized to create ticket this order",
    de: "Sie sind nicht berechtigt, ein Ticket für diese Bestellung zu erstellen",
  },
  MESSAGE_SENT: {
    fa: "پیام با موفقیت ارسال شد",
    en: "Message sent successfully",
    de: "Nachricht erfolgreich gesendet",
  },
  MESSAGE_DELETED: {
    fa: "پیام با موفقیت حذف شد",
    en: "Message deleted successfully",
    de: "Nachricht erfolgreich gelöscht",
  },

  MATERIAL_NOT_FOUND: {
    fa: "متریال یافت نشد",
    en: "Material not found",
    de: "Material nicht gefunden",
  },
  MATERIAL_CREATED: {
    fa: "متریال با موفقیت ایجاد شد",
    en: "Material created successfully",
    de: "Material erfolgreich erstellt",
  },
  MATERIALS_FETCHED: {
    fa: "متریال‌ها با موفقیت دریافت شدند",
    en: "Materials fetched successfully",
    de: "Materialien erfolgreich abgerufen",
  },
  MATERIAL_FETCHED: {
    fa: "متریال با موفقیت دریافت شد",
    en: "Material fetched successfully",
    de: "Material erfolgreich abgerufen",
  },
  MATERIAL_UPDATED: {
    fa: "متریال با موفقیت به‌روزرسانی شد",
    en: "Material updated successfully",
    de: "Material erfolgreich aktualisiert",
  },
  MATERIAL_DELETED: {
    fa: "متریال با موفقیت حذف شد",
    en: "Material deleted successfully",
    de: "Material erfolgreich gelöscht",
  },
  MATERIAL_CATEGORY_CREATED: {
    fa: "دسته‌بندی متریال با موفقیت ایجاد شد",
    en: "Material category created successfully",
    de: "Materialkategorie erfolgreich erstellt",
  },
  MATERIAL_CATEGORIES_FETCHED: {
    fa: "دسته‌بندی‌های متریال با موفقیت دریافت شدند",
    en: "Material categories fetched successfully",
    de: "Materialkategorien erfolgreich abgerufen",
  },
  MATERIAL_CATEGORY_FETCHED: {
    fa: "دسته‌بندی متریال با موفقیت دریافت شد",
    en: "Material category fetched successfully",
    de: "Materialkategorie erfolgreich abgerufen",
  },
  MATERIAL_CATEGORY_NOT_FOUND: {
    fa: "دسته‌بندی متریال یافت نشد",
    en: "Material category not found",
    de: "Materialkategorie nicht gefunden",
  },
  MATERIAL_CATEGORY_NOT_FOUND_OR_DELETED: {
    fa: "دسته‌بندی متریال یافت نشد یا قبلاً حذف شده است",
    en: "Material category not found or already deleted",
    de: "Materialkategorie nicht gefunden oder bereits gelöscht",
  },
  MATERIAL_CATEGORY_UPDATED: {
    fa: "دسته‌بندی متریال با موفقیت به‌روزرسانی شد",
    en: "Material category updated successfully",
    de: "Materialkategorie erfolgreich aktualisiert",
  },
  MATERIAL_CATEGORY_DELETED: {
    fa: "دسته‌بندی متریال با موفقیت حذف شد",
    en: "Material category deleted successfully",
    de: "Materialkategorie erfolgreich gelöscht",
  },

  CATEGORY_FETCHED: {
    fa: "دسته‌بندی با موفقیت دریافت شد",
    en: "Category fetched successfully",
    de: "Kategorie erfolgreich abgerufen",
  },
  CATEGORY_CREATED: {
    fa: "دسته‌بندی با موفقیت ایجاد شد",
    en: "Category created successfully",
    de: "Kategorie erfolgreich erstellt",
  },
  CATEGORY_UPDATED: {
    fa: "دسته‌بندی با موفقیت به‌روزرسانی شد",
    en: "Category updated successfully",
    de: "Kategorie erfolgreich aktualisiert",
  },
  CATEGORY_DELETED: {
    fa: "دسته‌بندی با موفقیت حذف شد",
    en: "Category deleted successfully",
    de: "Kategorie erfolgreich gelöscht",
  },

  CATALOG_FETCHED: {
    fa: "کاتالوگ با موفقیت دریافت شد",
    en: "Catalog fetched successfully",
    de: "Katalog erfolgreich abgerufen",
  },
  CATALOG_CREATED: {
    fa: "کاتالوگ با موفقیت ایجاد شد",
    en: "Catalog created successfully",
    de: "Katalog erfolgreich erstellt",
  },
  CATALOG_UPDATED: {
    fa: "کاتالوگ با موفقیت به‌روزرسانی شد",
    en: "Catalog updated successfully",
    de: "Katalog erfolgreich aktualisiert",
  },
  CATALOG_DELETED: {
    fa: "کاتالوگ با موفقیت حذف شد",
    en: "Catalog deleted successfully",
    de: "Katalog erfolgreich gelöscht",
  },

  COLORS_FETCHED: {
    fa: "رنگ‌ها با موفقیت دریافت شدند",
    en: "Colors fetched successfully",
    de: "Farben erfolgreich abgerufen",
  },
  COLOR_DROPDOWN_FETCHED: {
    fa: "لیست رنگ‌ها با موفقیت دریافت شد",
    en: "Color dropdown fetched successfully",
    de: "Farbauswahl erfolgreich abgerufen",
  },
  COLOR_CREATED: {
    fa: "رنگ با موفقیت ایجاد شد",
    en: "Color created successfully",
    de: "Farbe erfolgreich erstellt",
  },
  COLOR_UPDATED: {
    fa: "رنگ با موفقیت به‌روزرسانی شد",
    en: "Color updated successfully",
    de: "Farbe erfolgreich aktualisiert",
  },
  COLOR_DELETED: {
    fa: "رنگ با موفقیت حذف شد",
    en: "Color deleted successfully",
    de: "Farbe erfolgreich gelöscht",
  },

  CATEGORY_COLORS_FETCHED: {
    fa: "رنگ‌های دسته‌بندی با موفقیت دریافت شدند",
    en: "Category colors fetched successfully",
    de: "Kategoriefarben erfolgreich abgerufen",
  },
  CATEGORY_COLOR_CREATED: {
    fa: "رنگ دسته‌بندی با موفقیت ایجاد شد",
    en: "Category color created successfully",
    de: "Kategoriefarbe erfolgreich erstellt",
  },
  CATEGORY_COLOR_UPDATED: {
    fa: "رنگ دسته‌بندی با موفقیت به‌روزرسانی شد",
    en: "Category color updated successfully",
    de: "Kategoriefarbe erfolgreich aktualisiert",
  },
  CATEGORY_COLOR_DELETED: {
    fa: "رنگ دسته‌بندی با موفقیت حذف شد",
    en: "Category color deleted successfully",
    de: "Kategoriefarbe erfolgreich gelöscht",
  },

  DEVICE_FETCHED: {
    fa: "دستگاه با موفقیت دریافت شد",
    en: "Device fetched successfully",
    de: "Gerät erfolgreich abgerufen",
  },
  DEVICE_CREATED: {
    fa: "دستگاه با موفقیت ایجاد شد",
    en: "Device created successfully",
    de: "Gerät erfolgreich erstellt",
  },
  DEVICE_UPDATED: {
    fa: "دستگاه با موفقیت به‌روزرسانی شد",
    en: "Device updated successfully",
    de: "Gerät erfolgreich aktualisiert",
  },
  DEVICE_DELETED: {
    fa: "دستگاه با موفقیت حذف شد",
    en: "Device deleted successfully",
    de: "Gerät erfolgreich gelöscht",
  },

  VOLUME_FETCHED: {
    fa: "حجم با موفقیت دریافت شد",
    en: "Volume fetched successfully",
    de: "Volumen erfolgreich abgerufen",
  },
  VOLUME_CREATED: {
    fa: "حجم با موفقیت ایجاد شد",
    en: "Volume created successfully",
    de: "Volumen erfolgreich erstellt",
  },
  VOLUME_UPDATED: {
    fa: "حجم با موفقیت به‌روزرسانی شد",
    en: "Volume updated successfully",
    de: "Volumen erfolgreich aktualisiert",
  },
  VOLUME_DELETED: {
    fa: "حجم با موفقیت حذف شد",
    en: "Volume deleted successfully",
    de: "Volumen erfolgreich gelöscht",
  },

  TAXES_FETCHED: {
    fa: "مالیات‌ها با موفقیت دریافت شدند",
    en: "Taxes fetched successfully",
    de: "Steuern erfolgreich abgerufen",
  },
  TAX_NOT_FOUND: {
    fa: "مالیات یافت نشد",
    en: "Tax not found",
    de: "Steuer nicht gefunden",
  },
  TAX_FETCHED: {
    fa: "مالیات با موفقیت دریافت شد",
    en: "Tax fetched successfully",
    de: "Steuer erfolgreich abgerufen",
  },
  TAX_CREATED: {
    fa: "مالیات با موفقیت ایجاد شد",
    en: "Tax created successfully",
    de: "Steuer erfolgreich erstellt",
  },
  TAX_UPDATED: {
    fa: "مالیات با موفقیت به‌روزرسانی شد",
    en: "Tax updated successfully",
    de: "Steuer erfolgreich aktualisiert",
  },
  TAX_DELETED: {
    fa: "مالیات با موفقیت حذف شد",
    en: "Tax deleted successfully",
    de: "Steuer erfolgreich gelöscht",
  },

  VIP_PRICES_FETCHED: {
    fa: "قیمت‌های VIP با موفقیت دریافت شدند",
    en: "VIP prices fetched successfully",
    de: "VIP-Preise erfolgreich abgerufen",
  },
  VIP_NOT_FOUND: {
    fa: "VIP یافت نشد",
    en: "VIP not found",
    de: "VIP nicht gefunden",
  },
  VIP_FETCHED: {
    fa: "VIP با موفقیت دریافت شد",
    en: "VIP fetched successfully",
    de: "VIP erfolgreich abgerufen",
  },
  VIP_CREATED: {
    fa: "VIP با موفقیت ایجاد شد",
    en: "VIP created successfully",
    de: "VIP erfolgreich erstellt",
  },
  VIP_UPDATED: {
    fa: "VIP با موفقیت به‌روزرسانی شد",
    en: "VIP updated successfully",
    de: "VIP erfolgreich aktualisiert",
  },
  VIP_DELETED: {
    fa: "VIP با موفقیت حذف شد",
    en: "VIP deleted successfully",
    de: "VIP erfolgreich gelöscht",
  },

  MATERIALSHADE_FETCHED: {
    fa: "شید متریال با موفقیت دریافت شد",
    en: "MaterialShade fetched successfully",
    de: "Materialschattierung erfolgreich abgerufen",
  },
  MATERIALSHADE_CREATED: {
    fa: "شید متریال با موفقیت ایجاد شد",
    en: "MaterialShade created successfully",
    de: "Materialschattierung erfolgreich erstellt",
  },
  MATERIALSHADE_UPDATED: {
    fa: "شید متریال با موفقیت به‌روزرسانی شد",
    en: "MaterialShade updated successfully",
    de: "Materialschattierung erfolgreich aktualisiert",
  },
  MATERIALSHADE_DELETED: {
    fa: "شید متریال با موفقیت حذف شد",
    en: "MaterialShade deleted successfully",
    de: "Materialschattierung erfolgreich gelöscht",
  },
  GOOGLE_SIGN_IN_REQUIRED: {
    fa: "لطفاً از ورود با Google استفاده کنید",
    en: "Please use Google sign in for this account",
    de: "Bitte verwenden Sie die Google-Anmeldung für dieses Konto",
  },
  REFRESH_TOKEN_INVALID: {
    fa: "توکن بازسازی نامعتبر یا منقضی شده است",
    en: "refresh token is invalid or expired",
    de: "Refresh-Token ist ungültig oder abgelaufen",
  },
  TOKEN_REFRESHED: {
    fa: "توکن با موفقیت بازسازی شد",
    en: "token refreshed successfully",
    de: "Token erfolgreich erneuert",
  },
  OTP_SENT_VERIFY_EMAIL: {
    fa: "کد تأیید ارسال شد. لطفاً ایمیل خود را تأیید کنید",
    en: "OTP sent successfully. Please verify email to complete signup.",
    de: "OTP erfolgreich gesendet. Bitte E-Mail verifizieren, um die Registrierung abzuschließen.",
  },
  IF_EMAIL_EXISTS_OTP_SENT: {
    fa: "اگر ایمیل وجود داشته باشد، کد تأیید ارسال شده است",
    en: "If email exists, OTP has been sent",
    de: "Wenn die E-Mail existiert, wurde ein OTP gesendet",
  },
  EMAIL_REQUIRED_FROM_GOOGLE: {
    fa: "ایمیل از حساب Google الزامی است",
    en: "Email is required from Google account",
    de: "E-Mail ist vom Google-Konto erforderlich",
  },
  MISSING_GOOGLE_INFO: {
    fa: "اطلاعات لازم از حساب Google دریافت نشد",
    en: "Missing required information from Google account",
    de: "Erforderliche Informationen vom Google-Konto fehlen",
  },
  NEW_PASSWORD_DIFFERENT: {
    fa: "رمز عبور جدید باید با رمز عبور فعلی متفاوت باشد",
    en: "New password must be different from current password",
    de: "Das neue Passwort muss sich vom aktuellen Passwort unterscheiden",
  },
  GOOGLE_ACCOUNT_NO_RESET: {
    fa: "این حساب با Google ورود می‌کند. بازنشانی رمز عبور در دسترس نیست",
    en: "This account uses Google sign in. Password reset is not available",
    de: "Dieses Konto verwendet Google-Anmeldung. Passwort-Reset ist nicht verfügbar",
  },
  INVALID_GOOGLE_TOKEN_DYNAMIC: {
    fa: "توکن Google نامعتبر است",
    en: "Invalid Google token",
    de: "Ungültiges Google-Token",
  },
  INVALID_GOOGLE_TOKEN_PAYLOAD: {
    fa: "محموله توکن Google نامعتبر است",
    en: "Invalid Google token payload",
    de: "Ungültige Google-Token-Nutzlast",
  },
} as const satisfies Record<string, LocalizedText>;

export type MessageKey = keyof typeof MESSAGES;
