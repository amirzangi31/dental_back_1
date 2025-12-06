
import { eq } from "drizzle-orm";

type TablesRefs = {
  category: any;
  device: any;
  materialshade: any;
  implant: any;
  additionalscan: any;
};

export async function calculateSingleToothPrice(
  db: any, 
  toothRecord: {
    id?: number;
    toothnumber?: number;
    category?: number | null;
    device?: number | null;
    materialshade?: number | null;
    implant?: number | null;
    additionalscan?: number | null;
    volume?: any; 
  },    
  tables: TablesRefs
): Promise<number> {
  try {
    const [
      categoryRow,
      deviceRow,
      materialRow,
      implantRow,
      additionalscanRow,
    ] = await Promise.all([
      toothRecord.category
        ? db
            .select({ price: tables.category.price })
            .from(tables.category)
            .where(eq(tables.category.id, toothRecord.category))
            .limit(1)
        : Promise.resolve([]),
      toothRecord.device
        ? db
            .select({ price: tables.device.price })
            .from(tables.device)
            .where(eq(tables.device.id, toothRecord.device))
            .limit(1)
        : Promise.resolve([]),
      toothRecord.materialshade
        ? db
            .select({ price: tables.materialshade.price })
            .from(tables.materialshade)
            .where(eq(tables.materialshade.id, toothRecord.materialshade))
            .limit(1)
        : Promise.resolve([]),
      toothRecord.implant
        ? db
            .select({ price: tables.implant.price })
            .from(tables.implant)
            .where(eq(tables.implant.id, toothRecord.implant))
            .limit(1)
        : Promise.resolve([]),
      toothRecord.additionalscan
        ? db
            .select({ price: tables.additionalscan.price })
            .from(tables.additionalscan)
            .where(eq(tables.additionalscan.id, toothRecord.additionalscan))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const parsePrice = (rowArr: any[]) => {
      if (!rowArr || rowArr.length === 0) return 0;
      const val = rowArr[0]?.price ?? 0;
      const n = typeof val === "number" ? val : parseFloat(String(val || 0));
      return Number.isFinite(n) ? n : 0;
    };

    const categoryPrice = parsePrice(categoryRow);
    const devicePrice = parsePrice(deviceRow);
    const materialPrice = parsePrice(materialRow);
    const implantPrice = parsePrice(implantRow);
    const additionalscanPrice = parsePrice(additionalscanRow);

    let volumeTotal = 0;
    if (Array.isArray(toothRecord.volume)) {
      volumeTotal = toothRecord.volume.reduce((sum: number, v: any) => {
        const p = v?.price ?? v?.defaultvalue ?? 0;
        const num = typeof p === "number" ? p : parseFloat(String(p || 0));
        return sum + (Number.isFinite(num) ? num : 0);
      }, 0);
    } else if (toothRecord.volume && typeof toothRecord.volume === "object") {
      const p = toothRecord.volume.price ?? toothRecord.volume.defaultvalue ?? 0;
      const num = typeof p === "number" ? p : parseFloat(String(p || 0));
      volumeTotal = Number.isFinite(num) ? num : 0;
    }

    const total =
      categoryPrice +
      devicePrice +
      materialPrice +
      implantPrice +
      additionalscanPrice +
      volumeTotal;

    return Number(Math.round((total + Number.EPSILON) * 100) / 100); 
  } catch (err) {
    console.error("calculateSingleToothPrice error:", err);
    return 0;
  }
}
