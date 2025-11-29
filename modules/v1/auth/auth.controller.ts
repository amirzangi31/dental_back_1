import crypto, { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import redis from "../../../config/redis";
import { db } from "../../../db";
import { users } from "../../../db/schema/users";
import { generateAccessToken } from "../../../utils/generateAccessToken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { decode, verify } from "jsonwebtoken";
import { compare, hash } from "bcryptjs";

export const sendemail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER || "zangiabadi1378888@gmail.com",
      to: email,
      subject: "Otp For Denatal Art",
      text: `Otp For Denatal Art: ${otp} 🤛🤛🤛`,
    };
    await redis.set(`otp:${email}`, otp, "EX", 300);

    if (typeof transporter !== "undefined") {
      await transporter.sendMail(mailOptions);
    } else {
      console.log("ارسال ایمیل فعال نشده است. کد برای", email, ":", otp);
    }

    return successResponse(res, 200, { otp }, "email sent successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const verifyemail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const savedOtp = await redis.get(`otp:${email}`);
    if (!savedOtp) {
      return errorResponse(res, 400, "OTP expired or not found", null);
    }

    if (savedOtp !== String(otp)) {
      return errorResponse(res, 400, "Invalid OTP", null);
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isDeleted: users.isDeleted,
      })
      .from(users)
      .where(eq(users.email, email));
    if (user.length > 0 && user[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }
    if (user.length > 0 && user[0].isDeleted === 1) {
      await redis.del(`refresh:${user[0].id}`);
      const refreshToken = randomUUID();
      await redis.set(
        `refresh:${user[0].id}`,
        refreshToken,
        "EX",
        parseInt(process.env.REFRESH_TOKEN_TIME as string)
      );
      const accessToken = generateAccessToken({
        userId: user[0].id,
        email: user[0].email,
        role: user[0].role,
      });
      return successResponse(
        res,
        200,
        {
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        "User already exists"
      );
    }

    const sessionId = crypto.randomUUID().toString();
    await redis.set(`sessionId:${email}`, sessionId, "EX", 60 * 60 * 10);
    await redis.del(`otp:${email}`);

    return successResponse(
      res,
      200,
      {
        sessionId,
        resultCode: 1200,
      },
      "email verified successfully"
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(res, 400, "Invalid JSON body", error);
    }
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, sessionId } = req.body;
    const sessionIdRedis = await redis.get(`sessionId:${email}`);

    if (!sessionIdRedis) {
      return errorResponse(res, 400, "sessionId is expired or not found", null);
    }

    if (sessionIdRedis !== sessionId) {
      return errorResponse(res, 400, "sessionId is invalid or expired", null);
    }
    const hashedPassword = await hash(req.body.password, 10);

    const user = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        role: req.body.role,
        name: req.body.name,
        lastName: req.body.lastName,
        country: req.body.country,
        postalCode: req.body.postalCode,
        phoneNumber: req.body.phoneNumber,
        specaility: req.body.specaility,
        laboratoryName: req.body.laboratoryName,
      })
      .returning();
    await redis.del(`sessionId:${email}`);
    const refreshToken = randomUUID();
    await redis.set(
      `refresh:${refreshToken}`,
      user[0].id,
      "EX",
      parseInt(process.env.REFRESH_TOKEN_TIME as string)
    );
    const accessToken = generateAccessToken({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role,
    });
    return successResponse(
      res,
      200,
      {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      "user created successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        password: users.password,
        isDeleted: users.isDeleted,
      })
      .from(users)
      .where(eq(users.email, email));
    const isPasswordCorrect = await compare(password, user[0].password);

    if (!isPasswordCorrect) {
      return errorResponse(res, 400, "Password is incorrect", null);
    }

    if (user.length > 0 && user[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }

    await redis.del(`refresh:${user[0].id}`);
    const refreshToken = randomUUID();
    await redis.set(
      `refresh:${user[0].id}`,
      refreshToken,
      "EX",
      parseInt(process.env.REFRESH_TOKEN_TIME as string)
    );
    const accessToken = generateAccessToken({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role,
    });
    return successResponse(
      res,
      200,
      {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      "User signed in successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = (req as any).token;
    const { refreshToken } = req.body;
    let email;
    try {
      const decoded: any = verify(token, process.env.SECRET_KEY as string);
      email = decoded.email;
    } catch (err) {
      return errorResponse(res, 401, "توکن نامعتبر است", null);
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isDeleted: users.isDeleted,
      })
      .from(users)
      .where(eq(users.email, email));
    if (user.length > 0 && user[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }
    if (user.length > 0 && user[0].isDeleted === 1) {
      const refreshTokenRedis = await redis.get(`refresh:${user[0].id}`);

      if (!refreshTokenRedis) {
        return errorResponse(
          res,
          401,
          "refresh token is invalid or expired",
          null
        );
      }
      if (refreshTokenRedis !== refreshToken) {
        return errorResponse(
          res,
          401,
          "refresh token is invalid or expired",
          null
        );
      }
    }

    await redis.del(`refresh:${user[0].id}`);
    const refreshTokenGenerated = randomUUID();
    await redis.set(
      `refresh:${user[0].id}`,
      refreshTokenGenerated,
      "EX",
      parseInt(process.env.REFRESH_TOKEN_TIME as string)
    );
    const accessToken = generateAccessToken({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role,
    });
    return successResponse(
      res,
      200,
      {
        accessToken: accessToken,
        refreshToken: refreshTokenGenerated,
      },
      "token refreshed successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = (req as any).token;
    const decoded: any = decode(token);

    await redis.del(`refresh:${decoded.email}`);
    return successResponse(res, 200, null, "User logged out successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};

export const user = async (req: Request, res: Response) => {
  try {
    const token = (req as any).token;
    const decoded: any = decode(token);
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        lastName: users.lastName,
        country: users.country,
        postalCode: users.postalCode,
        phoneNumber: users.phoneNumber,
        specaility: users.specaility,
        laboratoryName: users.laboratoryName,
      })
      .from(users)
      .where(eq(users.email, decoded.email));
    return successResponse(res, 200, user[0], "User fetched successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};
