import { sign, SignOptions } from "jsonwebtoken";

interface OtpPayload {
  expire: string;
  [key: string]: any;
}

export const generateOtpToken = (payload: OtpPayload) => {
  const secretKey = process.env.SECRET_KEY;

  const options = {
    expiresIn: payload.expire,
  };

  const token = sign(payload, secretKey as string, options as SignOptions);
  return token as string;
};
