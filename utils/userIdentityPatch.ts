type IdentityPatch = {
  nationalCode?: string | null;
  province?: string | null;
  taxCode?: string | null;
  economicCode?: string | null;
};

const textOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const userIdentityPatch = (body: object): IdentityPatch => {
  const source = body as Record<string, unknown>;
  const patch: IdentityPatch = {};

  if ("nationalCode" in source) patch.nationalCode = textOrNull(source.nationalCode);
  if ("province" in source) patch.province = textOrNull(source.province);
  if ("taxCode" in source) patch.taxCode = textOrNull(source.taxCode);
  if ("economicCode" in source) patch.economicCode = textOrNull(source.economicCode);

  return patch;
};
