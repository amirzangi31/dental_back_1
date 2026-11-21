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

const iranProvinceFa: Record<(typeof iranProvinceKeys)[number], string> = {
  "east-azerbaijan": "آذربایجان شرقی",
  "west-azerbaijan": "آذربایجان غربی",
  ardabil: "اردبیل",
  isfahan: "اصفهان",
  alborz: "البرز",
  ilam: "ایلام",
  bushehr: "بوشهر",
  tehran: "تهران",
  chaharmahal: "چهارمحال و بختیاری",
  "south-khorasan": "خراسان جنوبی",
  "razavi-khorasan": "خراسان رضوی",
  "north-khorasan": "خراسان شمالی",
  khuzestan: "خوزستان",
  zanjan: "زنجان",
  semnan: "سمنان",
  sistan: "سیستان و بلوچستان",
  fars: "فارس",
  qazvin: "قزوین",
  qom: "قم",
  kurdistan: "کردستان",
  kerman: "کرمان",
  kermanshah: "کرمانشاه",
  kohgiluyeh: "کهگیلویه و بویراحمد",
  golestan: "گلستان",
  gilan: "گیلان",
  lorestan: "لرستان",
  mazandaran: "مازندران",
  markazi: "مرکزی",
  hormozgan: "هرمزگان",
  hamadan: "همدان",
  yazd: "یزد",
};

export const iranProvinceLabel = (key: string | null | undefined) => {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  if ((iranProvinceKeys as readonly string[]).includes(trimmed)) {
    return iranProvinceFa[trimmed as (typeof iranProvinceKeys)[number]];
  }
  return trimmed;
};
