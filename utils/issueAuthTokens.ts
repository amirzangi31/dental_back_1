import { randomUUID } from "crypto";
import redis from "../config/redis";
import { generateAccessToken } from "./generateAccessToken";

type TokenUser = {
  id: number;
  email: string;
  role: string;
};

export const issueAuthTokens = async (
  user: TokenUser,
  options?: { remember?: boolean },
): Promise<{ accessToken: string; refreshToken: string }> => {
  await redis.del(`refresh:${user.id}`);
  const refreshToken = randomUUID();
  const ttl = options?.remember
    ? parseInt(process.env.REFRESH_TOKEN_TIME_LONG as string)
    : parseInt(process.env.REFRESH_TOKEN_TIME as string);

  await redis.set(`refresh:${user.id}`, refreshToken, "EX", ttl);

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { accessToken, refreshToken };
};
