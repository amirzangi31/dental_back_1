import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { sellerProfile } from "../../../db/schema/sellerProfile";
import { blank, InvoiceSeller } from "./invoiceDocument";

export type SellerProfile = InvoiceSeller;

const emptySellerProfile = (): SellerProfile => ({
  name: null,
  phone: null,
  address: null,
  postalCode: null,
  economicNumber: null,
  nationalId: null,
  registrationNumber: null,
  city: null,
});

const fromRow = (row: typeof sellerProfile.$inferSelect | undefined): SellerProfile => {
  if (!row) return emptySellerProfile();
  return {
    name: blank(row.name),
    phone: blank(row.phone),
    address: blank(row.address),
    postalCode: blank(row.postalCode),
    economicNumber: blank(row.economicNumber),
    nationalId: blank(row.nationalId),
    registrationNumber: blank(row.registrationNumber),
    city: blank(row.city),
  };
};

const storedFields = (input: Partial<SellerProfile>) => ({
  name: blank(input.name),
  phone: blank(input.phone),
  address: blank(input.address),
  postalCode: blank(input.postalCode),
  economicNumber: blank(input.economicNumber),
  nationalId: blank(input.nationalId),
  registrationNumber: blank(input.registrationNumber),
  city: blank(input.city),
});

export const readSellerProfile = async (executor: any = db): Promise<SellerProfile> => {
  const [row] = await executor
    .select()
    .from(sellerProfile)
    .where(eq(sellerProfile.id, 1));
  return fromRow(row);
};

export const saveSellerProfile = async (
  input: Partial<SellerProfile>,
): Promise<SellerProfile> => {
  const fields = storedFields(input);
  const [row] = await db
    .insert(sellerProfile)
    .values({
      id: 1,
      singletonKey: 1,
      ...fields,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sellerProfile.id,
      set: {
        ...fields,
        updatedAt: new Date(),
      },
    })
    .returning();

  return fromRow(row);
};
