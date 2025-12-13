import { sign } from "jsonwebtoken";

export const generateAccessToken = (payload: any) => {
  const secretKey = process.env.SECRET_KEY || ""; 

  const optionsAccess = {
    expiresIn: parseInt(process.env.ACCESS_TOKEN_TIME as string), 
  };
  const accessToken = sign({
    userId : payload.userId,
    email: payload.email,
    role: payload.role,
  }, secretKey, optionsAccess);
  return accessToken
};  


