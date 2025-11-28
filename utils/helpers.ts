import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema/users";

export const getUserInfo = async (userID: number) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userID))
    .limit(1);
  return user[0];
};
