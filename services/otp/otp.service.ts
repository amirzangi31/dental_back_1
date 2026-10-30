import crypto, { randomUUID } from "crypto";
import redis from "../../config/redis";
import { sendPatternSms, IpPanelError } from "./ippanel.client";
import {
  isValidIranMobile,
  normalizePhoneNumber,
} from "./phone";

const OTP_TTL_SECONDS = 120;
const SESSION_TTL_SECONDS = 60 * 60 * 10;
const RATE_LIMIT_SECONDS = 60;
const RATE_LIMIT_MAX = 3;

const otpKey = (phone: string) => `otp:phone:${phone}`;
const rateLimitKey = (phone: string) => `otp:rl:${phone}`;
const sessionKey = (phone: string) => `sessionId:phone:${phone}`;

export { IpPanelError };

export const normalizeAndValidateIranPhone = (input: string): string => {
  const e164 = normalizePhoneNumber(input);
  if (!isValidIranMobile(e164)) {
    throw new Error("INVALID_PHONE_NUMBER");
  }
  return e164;
};

export const generateOtpCode = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const assertOtpRateLimit = async (phone: string): Promise<void> => {
  const key = rateLimitKey(phone);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_SECONDS);
  }
  if (count > RATE_LIMIT_MAX) {
    throw new Error("OTP_RATE_LIMIT");
  }
};

export type SendPhoneOtpResult = {
  phone: string;
  /** Present only when OTP_MOCK_SMS=true (local/dev). */
  code?: string;
};

export const sendPhoneOtp = async (
  rawPhone: string,
): Promise<SendPhoneOtpResult> => {
  const phone = normalizeAndValidateIranPhone(rawPhone);
  await assertOtpRateLimit(phone);

  const code = generateOtpCode();
  await redis.set(otpKey(phone), code, "EX", OTP_TTL_SECONDS);

  // IPPanel is often unreachable outside Iran; mock skips SMS and returns the code.
  if (process.env.OTP_MOCK_SMS === "true") {
    console.info(`[OTP_MOCK_SMS] phone=${phone} code=${code}`);
    return { phone, code };
  }

  try {
    await sendPatternSms({ recipient: phone, code });
  } catch (err) {
    await redis.del(otpKey(phone));
    throw err;
  }

  return { phone };
};

export const verifyPhoneOtp = async (
  rawPhone: string,
  otp: string,
): Promise<string> => {
  const phone = normalizeAndValidateIranPhone(rawPhone);
  const saved = await redis.get(otpKey(phone));

  if (!saved) {
    throw new Error("OTP_EXPIRED_OR_NOT_FOUND");
  }
  if (saved !== String(otp).trim()) {
    throw new Error("INVALID_OTP");
  }

  await redis.del(otpKey(phone));
  return phone;
};

export const createPhoneSession = async (phone: string): Promise<string> => {
  const sessionId = randomUUID();
  await redis.set(sessionKey(phone), sessionId, "EX", SESSION_TTL_SECONDS);
  return sessionId;
};

export const consumePhoneSession = async (
  phone: string,
  sessionId: string,
): Promise<void> => {
  const key = sessionKey(phone);
  const saved = await redis.get(key);
  if (!saved) {
    throw new Error("SESSION_ID_EXPIRED");
  }
  if (saved !== sessionId) {
    throw new Error("SESSION_ID_INVALID");
  }
  await redis.del(key);
};
