/**
 * Normalize Iranian / E.164 phone numbers for storage and IPPanel.
 * Accepts: 0912..., 912..., +98912..., 0098912...
 */
export const normalizePhoneNumber = (input: string): string => {
  let phone = (input || "").trim().replace(/[\s\-()]/g, "");

  if (phone.startsWith("00")) {
    phone = `+${phone.slice(2)}`;
  }

  if (phone.startsWith("+98")) {
    return `+98${phone.slice(3).replace(/^0+/, "")}`;
  }

  if (phone.startsWith("98") && phone.length >= 12) {
    return `+${phone}`;
  }

  if (phone.startsWith("0") && phone.length === 11) {
    return `+98${phone.slice(1)}`;
  }

  if (phone.length === 10 && phone.startsWith("9")) {
    return `+98${phone}`;
  }

  if (phone.startsWith("+")) {
    return phone;
  }

  throw new Error("INVALID_PHONE_NUMBER");
};

export const isValidIranMobile = (e164: string): boolean => {
  return /^\+989\d{9}$/.test(e164);
};

/** Normalize sender like 3000505 or 983000505 → +983000505 */
export const normalizeSenderNumber = (input: string): string => {
  let sender = (input || "").trim().replace(/[\s\-]/g, "");

  if (sender.startsWith("00")) {
    sender = `+${sender.slice(2)}`;
  }
  if (sender.startsWith("+")) {
    return sender;
  }
  if (sender.startsWith("98")) {
    return `+${sender}`;
  }
  return `+98${sender}`;
};
