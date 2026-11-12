export const isValidIranNationalCode = (value: string) => {
  if (!/^\d{10}$/.test(value)) return false;
  if (/^(\d)\1{9}$/.test(value)) return false;

  const check = Number(value[9]);
  const sum = value
    .slice(0, 9)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;

  return remainder < 2 ? check === remainder : check === 11 - remainder;
};

export const iranProvinceKeys = [
  "east-azerbaijan",
  "west-azerbaijan",
  "ardabil",
  "isfahan",
  "alborz",
  "ilam",
  "bushehr",
  "tehran",
  "chaharmahal",
  "south-khorasan",
  "razavi-khorasan",
  "north-khorasan",
  "khuzestan",
  "zanjan",
  "semnan",
  "sistan",
  "fars",
  "qazvin",
  "qom",
  "kurdistan",
  "kerman",
  "kermanshah",
  "kohgiluyeh",
  "golestan",
  "gilan",
  "lorestan",
  "mazandaran",
  "markazi",
  "hormozgan",
  "hamadan",
  "yazd",
] as const;
