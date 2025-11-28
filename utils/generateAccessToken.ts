import { sign } from "jsonwebtoken";

export const generateAccessToken = (payload: any) => {
  const secretKey = process.env.SECRET_KEY || ""; 

  const optionsAccess = {
    expiresIn: 60 * 60, 
  };
  const accessToken = sign({
    userId : payload.userId,
    email: payload.email,
    role: payload.role,
  }, secretKey, optionsAccess);
  return accessToken
};  


