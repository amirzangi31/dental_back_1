export type AppRegion = "iran" | "germany";

export const getAppRegion = (): AppRegion => {
  const value = (process.env.APP_REGION || "iran").toLowerCase();
  return value === "germany" ? "germany" : "iran";
};

export const isIranRegion = (): boolean => getAppRegion() === "iran";
