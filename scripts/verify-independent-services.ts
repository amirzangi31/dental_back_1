import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema/users";
import { files } from "../db/schema/files";
import { orders } from "../db/schema/orders";
import {
  independentService,
  independentServiceCategory,
  independentServiceOption,
} from "../db/schema/independentService";
import {
  insertIndependentLines,
  loadIndependentServicesByOrders,
  resolveIndependentSelection,
} from "../modules/v1/independentService/resolveSelection";

const run = async () => {
  const [user] = await db.select({ id: users.id }).from(users).limit(1);
  assert.ok(user, "need at least one user");
  let categoryId = 0;
  let orderId = 0;
  let fileId = 0;
  try {
    const [category] = await db
      .insert(independentServiceCategory)
      .values({ title: "خدمات قالب‌گیری تست", sortOrder: 1 })
      .returning();
    categoryId = category.id;
    const [optionService] = await db
      .insert(independentService)
      .values({ categoryId: category.id, title: "قالب‌گیری فک", type: "options", sortOrder: 1 })
      .returning();
    const [upper] = await db
      .insert(independentServiceOption)
      .values({ serviceId: optionService.id, title: "فک بالا", price: "500000.00", sortOrder: 1 })
      .returning();
    const [lower] = await db
      .insert(independentServiceOption)
      .values({ serviceId: optionService.id, title: "فک پایین", price: "500000.00", sortOrder: 2 })
      .returning();
    const [third] = await db
      .insert(independentServiceOption)
      .values({ serviceId: optionService.id, title: "فک سوم", price: "100000.00", sortOrder: 0 })
      .returning();
    const ordered = await db
      .select({ id: independentServiceOption.id })
      .from(independentServiceOption)
      .where(eq(independentServiceOption.serviceId, optionService.id))
      .orderBy(independentServiceOption.sortOrder);
    assert.deepEqual(ordered.map((row) => row.id), [third.id, upper.id, lower.id]);

    const both = await resolveIndependentSelection({
      optionIds: [upper.id, lower.id],
      price: 1,
    });
    assert.equal(both.ok, true);
    if (!both.ok) return;
    assert.equal(both.subtotal, 1000000);
    assert.deepEqual(
      both.lines.map((line) => line.optionTitle),
      ["فک بالا", "فک پایین"],
    );

    const [fileService] = await db
      .insert(independentService)
      .values({
        categoryId: category.id,
        title: "ارسال فایل اسکن",
        type: "file",
        price: "300000.00",
        sortOrder: 2,
      })
      .returning();
    const [file] = await db
      .insert(files)
      .values({
        filename: "scan-test.bin",
        originalname: "scan-test.bin",
        mimetype: "application/octet-stream",
        size: 12,
        path: "order-files/scan-test.bin",
        user_id: user.id,
        isDeleted: 0,
      })
      .returning();
    fileId = file.id;
    const withFile = await resolveIndependentSelection(
      {
        optionIds: [upper.id, lower.id],
        arch: "bottom",
        fileServices: [{ serviceId: fileService.id, fileIds: [file.id], price: 9 }],
      },
      { userId: user.id, requireOwnedFiles: true },
    );
    assert.equal(withFile.ok, true);
    if (!withFile.ok) return;
    assert.equal(withFile.subtotal, 1300000);

    const ignored = await resolveIndependentSelection({
      fileServices: [{ serviceId: fileService.id, fileIds: [] }],
    });
    assert.equal(ignored.ok && ignored.lines.length, 0);

    const badOwner = await resolveIndependentSelection(
      { fileServices: [{ serviceId: fileService.id, fileIds: [file.id] }] },
      { userId: user.id + 999999, requireOwnedFiles: true },
    );
    assert.equal(badOwner.ok, false);

    const [order] : any = (await db
      .insert(orders)
      .values({
        user_id: user.id,
        status: "payment",
        totalaprice: "2000000.00",
        patientname: "تست خدمات مستقل",
      })
      .returning()) as any;
    orderId = order.id;
    await insertIndependentLines(db, order.id, withFile.lines);
    await db
      .update(independentServiceOption)
      .set({ price: "900000.00", title: "فک بالای جدید" })
      .where(eq(independentServiceOption.id, upper.id));
    await db
      .update(independentService)
      .set({ price: "1.00", title: "عنوان جدید" })
      .where(eq(independentService.id, fileService.id));
    const stored = (await loadIndependentServicesByOrders(db, [order.id])).get(order.id) ?? [];
    assert.equal(stored.length, 3);
    assert.equal(Number(stored[0].price), 500000);
    assert.equal(stored[0].optionTitle, "فک بالا");
    assert.equal(stored[1].optionTitle, "فک پایین");
    assert.equal(Number(stored[2].price), 300000);
    assert.equal(stored[2].serviceTitle, "ارسال فایل اسکن");
    assert.equal(stored[2].files[0]?.id, file.id);
    assert.equal(stored[0].arch, "bottom");
    assert.equal(stored[2].arch, "bottom");
    console.log("independent service checks passed");
  } finally {
    if (orderId) await db.delete(orders).where(eq(orders.id, orderId));
    if (categoryId) {
      const services = await db
        .select({ id: independentService.id })
        .from(independentService)
        .where(eq(independentService.categoryId, categoryId));
      if (services.length) {
        await db.delete(independentService).where(eq(independentService.categoryId, categoryId));
      }
      await db.delete(independentServiceCategory).where(eq(independentServiceCategory.id, categoryId));
    }
    if (fileId) await db.delete(files).where(eq(files.id, fileId));
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
