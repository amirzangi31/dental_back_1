import * as yup from "yup";

const optionalText = () =>
  yup
    .string()
    .nullable()
    .optional()
    .transform((value, original) => {
      if (original === undefined) return undefined;
      if (original === null || original === "" || original === "null") return null;
      return value;
    });

const optionalId = () =>
  yup
    .number()
    .nullable()
    .optional()
    .transform((value, original) => {
      if (
        original === undefined ||
        original === null ||
        original === "" ||
        original === "null" ||
        original === "0" ||
        original === 0
      ) {
        return null;
      }
      return Number.isNaN(value) ? null : value;
    });

export const createCategorySchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  description: optionalText(),
  price: optionalId(),
  catalog: optionalId(),
  color: optionalId(),
});

export const updateCategorySchema = yup.object().shape({
  title: yup.string().optional(),
  description: optionalText(),
  price: optionalId(),
  catalog: optionalId(),
  color: optionalId(),
});
