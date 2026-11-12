export const parseDefinedPrice = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount;
};
