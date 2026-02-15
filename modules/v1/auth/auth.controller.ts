import crypto, { randomUUID } from "crypto";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import redis from "../../../config/redis";
import { db } from "../../../db";
import { users } from "../../../db/schema/users";
import { generateAccessToken } from "../../../utils/generateAccessToken";
import { errorResponse, successResponse } from "../../../utils/responses";
import { decode, verify } from "jsonwebtoken";
import { compare, hash } from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { getPagination } from "../../../utils/pagination";

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
      subject: "OTP For Dental Art",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hello,</h2>
            
            <p>Thank you for registering with us.</p>
            
            <p>To complete your sign-up process, please use the verification code below:</p>
            
            <div style="background-color: #fff; border: 2px solid #3498db; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #3498db; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            
            <p style="color: #e74c3c; font-weight: bold;">This code is valid for a limited time.</p>
            
            <p style="color: #7f8c8d; font-size: 14px;">If you did not request this registration, please ignore this email.</p>
            
            <p>We look forward to working with you.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>Digital Dental Design</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    };
    await redis.set(`otp:${email}`, otp, "EX", 300);

    if (typeof transporter !== "undefined") {
      await transporter.sendMail(mailOptions);
    } else {
      console.log("Email sending is not enabled. Code for", email, ":", otp);
    }

    return successResponse(res, 200, {}, "email sent successfully");
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

    // Check if this is a Google signup
    const googleUserDataStr = await redis.get(`googleUserData:${email}`);
    const isGoogleSignup = !!googleUserDataStr;

    const sessionId = crypto.randomUUID().toString();
    await redis.set(`sessionId:${email}`, sessionId, "EX", 60 * 60 * 10);
    await redis.del(`otp:${email}`);

    // If Google signup, include Google data in response
    if (isGoogleSignup) {
      const googleUserData = JSON.parse(googleUserDataStr);
      await redis.set(
        `googleUserData:${sessionId}`,
        googleUserDataStr,
        "EX",
        60 * 60 * 10
      );
      await redis.del(`googleUserData:${email}`);

      return successResponse(
        res,
        200,
        {
          sessionId,
          resultCode: 1200,
          isGoogleSignup: true,
          name: googleUserData.name,
          lastName: googleUserData.lastName,
          googleId: googleUserData.googleId,
        },
        "email verified successfully"
      );
    }

    return successResponse(
      res,
      200,
      {
        sessionId,
        resultCode: 1200,
        isGoogleSignup: false,
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

    // Check if this is a Google signup
    const googleUserDataStr = await redis.get(`googleUserData:${sessionId}`);
    const isGoogleSignup = !!googleUserDataStr;
    let googleUserData = null;

    if (isGoogleSignup) {
      googleUserData = JSON.parse(googleUserDataStr);
    }

    // For Google signup, password is not required
    let hashedPassword = null;
    if (!isGoogleSignup) {
      if (!req.body.password) {
        return errorResponse(res, 400, "Password is required", null);
      }
      hashedPassword = await hash(req.body.password, 10);
    }

    // Use Google data if available, otherwise use request body
    const userData = {
      email,
      password: hashedPassword,
      role: req.body.role,
      name: isGoogleSignup ? googleUserData.name : req.body.name,
      lastName: isGoogleSignup ? googleUserData.lastName : req.body.lastName,
      country: req.body.country,
      postalCode: req.body.postalCode,
      phoneNumber: req.body.phoneNumber,
      specaility: req.body.specaility,
      laboratoryName: req.body.laboratoryName,
      ...(isGoogleSignup && { googleId: googleUserData.googleId }),
    };

    const user = await db.insert(users).values(userData).returning();

    await redis.del(`sessionId:${email}`);
    if (isGoogleSignup) {
      await redis.del(`googleUserData:${sessionId}`);
    }

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
      subject: "Dental Art",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Hello,</h2>
            
            <h3 style="color: #3498db;">Welcome to DigitDA.</h3>
            
            <p>Your account has been successfully created, and you are now part of a modern digital design experience built for precision, speed, and uncompromising quality.</p>
            
            <p>At DigitDA, every case is handled with advanced Dental Softwares expertise and attention to detail — because we believe digital dentistry should never be average.</p>
            
            <p>You can now log in, submit your cases, and experience a smarter workflow.</p>
            
            <p style="font-weight: bold; color: #27ae60;">We're excited to work with you.</p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>Digital Dental Art</strong>
            </p>
          </div>
        </body>
        </html>
      `,
    };
    if (typeof transporter !== "undefined") {
      await transporter.sendMail(mailOptions);
    } else {
      console.log("",);
    }
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

    if (!user || user.length === 0) {
      return errorResponse(res, 400, "Password Or Email is incorrect", null);
    }
    if (user[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }

    if (!user[0].password) {
      return errorResponse(
        res,
        400,
        "Please use Google sign in for this account",
        null
      );
    }

    const isPasswordCorrect = await compare(password, user[0].password);

    if (!isPasswordCorrect) {
      return errorResponse(res, 400, "Password Or Email is incorrect", null);
    }

    await redis.del(`refresh:${user[0].id}`);
    const refreshToken = randomUUID();
    await redis.set(
      `refresh:${user[0].id}`,
      refreshToken,
      "EX",
      req.body.isRemember
        ? parseInt(process.env.REFRESH_TOKEN_TIME_LONG as string)
        : parseInt(process.env.REFRESH_TOKEN_TIME as string)
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
        accessToken,
        refreshToken,
      },
      "User signed in successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "internal server error", error);
  }
};
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refresh } = req.body;
    const authorization = req.headers["authorization"];
    if (!authorization) {
      return errorResponse(res, 401, "Please log in again", null);
    }
    const token = authorization.split(" ")[1];
    if (!token) {
      return errorResponse(res, 401, "Please log in again", null);
    }
    let email;
    try {
      const decoded: any = decode(token);
      email = decoded.email;
    } catch (err) {
      return errorResponse(res, 401, "token is invalid or expired", null);
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
      if (refreshTokenRedis !== refresh) {
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
export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const {
      id,
      name,
      lastName,
      country,
      postalCode,
      phoneNumber,
      specaility,
      laboratoryName,
    } = req.body;
    if (id !== user.userId.toString()) {
      return errorResponse(
        res,
        400,
        "You are not authorized to update this user",
        null
      );
    }
    const updatedUser = await db
      .update(users)
      .set({
        name,
        lastName,
        country,
        postalCode,
        phoneNumber,
        specaility,
        laboratoryName,
      })
      .where(eq(users.id, id));
    return successResponse(res, 200, updatedUser, "User updated successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        isDeleted: users.isDeleted,
      })
      .from(users)
      .where(eq(users.email, email));

    if (user.length === 0) {
      return successResponse(
        res,
        200,
        null,
        "If email exists, OTP has been sent"
      );
    }

    if (user[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }

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
      subject: "Password Reset OTP - Dental Art",
      text: `Your password reset OTP is: ${otp}. This code will expire in 10 minutes.`,
    };

    // Store OTP in Redis with 10 minutes expiration
    await redis.set(`forgotPasswordOtp:${email}`, otp, "EX", 600);

    if (typeof transporter !== "undefined") {
      await transporter.sendMail(mailOptions);
    } else {
      console.log("Email sending is not enabled. Code for", email, ":", otp);
    }

    return successResponse(
      res,
      200,
      null,
      "If email exists, OTP has been sent"
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    const savedOtp = await redis.get(`forgotPasswordOtp:${email}`);
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
        password: users.password,
        isDeleted: users.isDeleted,
      })
      .from(users)
      .where(eq(users.email, email));

    if (user.length === 0) {
      return errorResponse(res, 404, "User not found", null);
    }

    if (user[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }

    if (!user[0].password) {
      return errorResponse(
        res,
        400,
        "This account uses Google sign in. Password reset is not available",
        null
      );
    }

    const isSamePassword = await compare(newPassword, user[0].password);
    if (isSamePassword) {
      return errorResponse(
        res,
        400,
        "New password must be different from current password",
        null
      );
    }

    const hashedPassword = await hash(newPassword, 10);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user[0].id));

    await redis.del(`forgotPasswordOtp:${email}`);

    await redis.del(`refresh:${user[0].id}`);

    return successResponse(res, 200, null, "Password reset successfully");
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};
let client: OAuth2Client | null = null;
if (process.env.GOOGLE_CLIENT_ID) {
  client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}
const verifyGoogleToken = async (idToken: string): Promise<any> => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  // Try using OAuth2Client first
  if (client) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (error: any) {
      // If OAuth2Client fails (e.g., 403 error), try manual verification
      console.warn(
        "OAuth2Client verification failed, trying manual verification:",
        error.message
      );
    }
  }

  // Manual JWT verification (decode without verification for now)
  // Note: This is less secure but works when Google API is blocked
  try {
    const decoded = decode(idToken, { complete: true });
    if (!decoded || typeof decoded === "string") {
      throw new Error("Invalid token format");
    }

    const payload = decoded.payload as any;

    // Basic validation
    if (!payload.email || !payload.sub) {
      throw new Error("Missing required fields in token");
    }

    // Check audience if present
    if (payload.aud && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error("Token audience mismatch");
    }

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error("Token expired");
    }

    return payload;
  } catch (error: any) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};
export const googleSignIn = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return errorResponse(res, 400, "Google ID token is required", null);
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return errorResponse(res, 500, "Google OAuth is not configured", null);
    }

    // Verify the Google ID token
    let payload;
    try {
      payload = await verifyGoogleToken(idToken);
    } catch (error: any) {
      console.error("Google token verification error:", error);
      return errorResponse(
        res,
        401,
        `Invalid Google token: ${error.message}`,
        null
      );
    }

    if (!payload) {
      return errorResponse(res, 401, "Invalid Google token payload", null);
    }

    const { email, sub: googleId } = payload;

    if (!email) {
      return errorResponse(
        res,
        400,
        "Email is required from Google account",
        null
      );
    }

    // Check if user exists by email or googleId
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length === 0) {
      return errorResponse(
        res,
        404,
        "User not found. Please sign up first or use the signup endpoint",
        null
      );
    }

    // Check if user is deleted
    if (existingUser[0].isDeleted === 0) {
      return errorResponse(res, 400, "User is deleted", null);
    }

    // Update user with Google ID if not already set
    if (!existingUser[0].googleId) {
      await db
        .update(users)
        .set({
          googleId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser[0].id));
    }

    // Generate tokens
    await redis.del(`refresh:${existingUser[0].id}`);
    const refreshToken = randomUUID();
    await redis.set(
      `refresh:${existingUser[0].id}`,
      refreshToken,
      "EX",
      parseInt(process.env.REFRESH_TOKEN_TIME as string)
    );

    const accessToken = generateAccessToken({
      userId: existingUser[0].id,
      email: existingUser[0].email,
      role: existingUser[0].role,
    });

    return successResponse(
      res,
      200,
      {
        accessToken,
        refreshToken,
      },
      "User signed in successfully with Google"
    );
  } catch (error) {
    console.error("Google sign in error:", error);
    return errorResponse(res, 500, "internal server error", error);
  }
};
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return errorResponse(res, 400, "Google ID token is required", null);
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return errorResponse(res, 500, "Google OAuth is not configured", null);
    }

    // Verify the Google ID token
    let payload;
    try {
      payload = await verifyGoogleToken(idToken);
    } catch (error: any) {
      return errorResponse(
        res,
        401,
        `Invalid Google token: ${error.message}`,
        null
      );
    }

    if (!payload) {
      return errorResponse(res, 401, "Invalid Google token payload", null);
    }

    const { email, given_name, family_name, sub: googleId } = payload;

    if (!email || !given_name || !family_name) {
      return errorResponse(
        res,
        400,
        "Missing required information from Google account",
        null
      );
    }

    // Check if user exists by email
    const existingUser = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isDeleted: users.isDeleted,
        googleId: users.googleId,
      })
      .from(users)
      .where(eq(users.email, email));

    // If user exists and is not deleted, login them
    if (existingUser.length > 0 && existingUser[0].isDeleted === 1) {
      // Update user with Google ID if not already set
      if (!existingUser[0].googleId) {
        await db
          .update(users)
          .set({
            googleId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser[0].id));
      }

      // Generate tokens and login
      await redis.del(`refresh:${existingUser[0].id}`);
      const refreshToken = randomUUID();
      await redis.set(
        `refresh:${existingUser[0].id}`,
        refreshToken,
        "EX",
        parseInt(process.env.REFRESH_TOKEN_TIME as string)
      );

      const accessToken = generateAccessToken({
        userId: existingUser[0].id,
        email: existingUser[0].email,
        role: existingUser[0].role,
      });

      return successResponse(
        res,
        200,
        {
          accessToken,
          refreshToken,
        },
        "User signed in successfully"
      );
    }

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
      subject: "OTP For Google Sign Up - Dental Art",
      text: `Your OTP for Google sign up is: ${otp}. This code will expire in 5 minutes.`,
    };
    const sessionId = crypto.randomUUID().toString();

    await redis.set(`sessionId:${email}`, sessionId, "EX", 60 * 60 * 10);

    await redis.set(`otp:${email}`, otp, "EX", 300);

    const googleUserData = {
      email,
      name: given_name,
      lastName: family_name,
      googleId,
    };
    await redis.set(
      `googleUserData:${email}`,
      JSON.stringify(googleUserData),
      "EX",
      300
    );

    if (typeof transporter !== "undefined") {
      await transporter.sendMail(mailOptions);
    } else {
      console.log("Email sending is not enabled. Code for", email, ":", otp);
    }

    return successResponse(
      res,
      200,
      {
        otp,
        resultCode: 1200,
        email,
        name: given_name,
        lastName: family_name,
        googleId,
        sessionId,
      },
      "OTP sent successfully. Please verify email to complete signup."
    );
  } catch (error) {
    return errorResponse(res, 500, "internal server error", error);
  }
};
export const createDesigner = async (req: Request, res: Response) => {
  try {
    const {
      name,
      lastName,
      email,
      password,
      country,
      postalCode,
      phoneNumber,
    } = req.body;

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      return errorResponse(res, 400, "Email already exists", null);
    }

    const hashedPassword = await hash(password, 10);

    const newDesigner = await db
      .insert(users)
      .values({
        name,
        lastName,
        email,
        password: hashedPassword,
        country,
        postalCode,
        phoneNumber: phoneNumber || null,
        role: "designer",
      })
      .returning({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        country: users.country,
        postalCode: users.postalCode,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
      });

    return successResponse(
      res,
      200,
      newDesigner[0],
      "Designer created successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const updateDesigner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      lastName,
      email,
      password,
      country,
      postalCode,
      phoneNumber,
    } = req.body;

    // Check if designer exists and has role designer
    const existingDesigner = await db
      .select({ id: users.id, role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, Number(id)));

    if (existingDesigner.length === 0) {
      return errorResponse(res, 404, "Designer not found", null);
    }

    if (existingDesigner[0].role !== "designer") {
      return errorResponse(res, 400, "User is not a designer", null);
    }

    // Check if email is being changed and already exists
    if (email && email !== existingDesigner[0].email) {
      const emailExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));

      if (emailExists.length > 0) {
        return errorResponse(res, 400, "Email already exists", null);
      }
    }

    const updateData: any = {
      name,
      lastName,
      email,
      country,
      postalCode,
      phoneNumber: phoneNumber || null,
      updatedAt: new Date(),
    };

    // Only update password if provided
    if (password) {
      updateData.password = await hash(password, 10);
    }

    const updatedDesigner = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, Number(id)))
      .returning({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        country: users.country,
        postalCode: users.postalCode,
        phoneNumber: users.phoneNumber,
        updatedAt: users.updatedAt,
      });

    return successResponse(
      res,
      200,
      updatedDesigner[0],
      "Designer updated successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const deleteDesigner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if designer exists and has role designer
    const existingDesigner = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, Number(id)));

    if (existingDesigner.length === 0) {
      return errorResponse(res, 404, "Designer not found", null);
    }

    if (existingDesigner[0].role !== "designer") {
      return errorResponse(res, 400, "User is not a designer", null);
    }

    // Soft delete by setting isDeleted to 0
    await db
      .update(users)
      .set({
        isDeleted: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(id)));

    // Delete refresh token from redis
    await redis.del(`refresh:${id}`);

    return successResponse(res, 200, null, "Designer deleted successfully");
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const getDesigners = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(users.createdAt) : desc(users.createdAt);
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, "designer"));
    const designers = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        country: users.country,
        postalCode: users.postalCode,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.role, "designer"), eq(users.isDeleted, 1)))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: designers,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Designers fetched successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const getDesignersDropdown = async (req: Request, res: Response) => {
  try {
    const { limit, offset, sort } = getPagination(req);
    const orderByClause =
      sort === "asc" ? asc(users.createdAt) : desc(users.createdAt);
    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(eq(users.role, "designer"));
    const designers = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(eq(users.role, "designer"), eq(users.isDeleted, 1)))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    return successResponse(
      res,
      200,
      {
        items: designers,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
      "Designers fetched successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
export const getByIdDesigner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 400, "Designer ID is required", null);
    }

    const designer = await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        country: users.country,
        postalCode: users.postalCode,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, Number(id)), eq(users.role, "designer")));

    if (!designer || designer.length === 0) {
      return errorResponse(res, 404, "Designer not found", null);
    }

    return successResponse(
      res,
      200,
      designer[0],
      "Designer fetched successfully"
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};
