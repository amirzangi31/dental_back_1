import { eq } from "drizzle-orm";

async function getPriceById(db: any, table: any, id: number | null) {
  if (!id) return 0;

  const row = await db
    .select({ price: table.price })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);

  return row?.[0]?.price ? Number(row[0].price) : 0;
}

async function getVolumePrices(db: any, volumeTable: any, volumes: any[]) {
  let total = 0;

  for (const v of volumes) {
    if (!v.id) continue;

    const row = await db
      .select({ price: volumeTable.price })
      .from(volumeTable)
      .where(eq(volumeTable.id, v.id))
      .limit(1);

    if (row?.[0]?.price) total += Number(row[0].price);
  }

  return total;
}

export async function calculateTeethTotalPrice(
  db: any,
  teethValues: any[],
  tables: any
) {
  let totalPrice = 0;

  for (const tooth of teethValues) {
    let price = 0;

    const check = async (table: any, id: number | null) => {
      const p = await getPriceById(db, table, id);
      if (p === 0) return { zero: true, price: 0 };
      return { zero: false, price: p };
    };

    const c1 = await check(tables.category, tooth.category);
    if (c1.zero) return 0;
    price += c1.price;

    const c2 = await check(tables.device, tooth.device);
    if (c2.zero) return 0;
    price += c2.price;

    const c3 = await check(tables.materialshade, tooth.materialshade);
    if (c3.zero) return 0;
    price += c3.price;

    const c4 = await check(tables.implant, tooth.implant);
    if (c4.zero) return 0;
    price += c4.price;

    const c5 = await check(tables.additionalscan, tooth.additionalscan);
    if (c5.zero) return 0;
    price += c5.price;

    if (Array.isArray(tooth.volume)) {
      for (const v of tooth.volume) {
        const cv = await check(tables.volume, v.id);
        if (cv.zero) return 0;
        price += cv.price;
      }
    } else if (tooth.volume?.id) {
      const cv = await check(tables.volume, tooth.volume.id);
      if (cv.zero) return 0;
      price += cv.price;
    }

    totalPrice += price;
  }

  return totalPrice;
}
