import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema/users";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "dentalart@2026";

async function createAdmin() {
  const hashedPassword = await hash(ADMIN_PASSWORD, 10);

  const existing = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        password: hashedPassword,
        role: "admin",
        isDeleted: 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing[0].id));

    console.log(`Admin updated: ${ADMIN_EMAIL} (id=${existing[0].id})`);
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name: "Admin",
        lastName: "User",
        country: "-",
        postalCode: "-",
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
        isDeleted: 1,
      })
      .returning({ id: users.id, email: users.email, role: users.role });

    console.log(`Admin created: ${created.email} (id=${created.id})`);
  }

  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
