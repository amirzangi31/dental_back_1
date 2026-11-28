import * as yup from "yup";

const booleanFlag = () =>
  yup.boolean().transform((_value, originalValue) => {
    if (originalValue === undefined) return undefined;
    return (
      originalValue === true ||
      originalValue === "true" ||
      originalValue === "1" ||
      originalValue === 1
    );
  });

const sortOrder = () =>
  yup
    .number()
    .transform((value, original) => {
      if (original === undefined || original === null || original === "") return 0;
      return value;
    })
    .integer()
    .min(0)
    .default(0);

export const createIndependentCategorySchema = yup.object({
  title: yup.string().trim().required("Title is required"),
  active: booleanFlag().default(true),
  sortOrder: sortOrder(),
});

export const updateIndependentCategorySchema = yup.object({
  title: yup.string().trim().optional(),
  active: booleanFlag().optional(),
  sortOrder: sortOrder().optional(),
});

const colorId = () =>
  yup
    .number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined || original === 0 || original === "0"
        ? undefined
        : value,
    )
    .integer()
    .positive();

const optionSchema = yup.object({
  id: yup.number().integer().positive().nullable().optional(),
  title: yup.string().trim().required("Title is required"),
  price: yup
    .number()
    .transform((value, original) => (original === "" || original === null ? undefined : value))
    .required("Price is required")
    .min(0),
  color: colorId().required("Color is required"),
  allowFile: booleanFlag().default(false),
  sortOrder: sortOrder().optional(),
});

export const createIndependentServiceSchema = yup.object({
  title: yup.string().trim().required("Title is required"),
  categoryId: yup.number().integer().positive().required("Category is required"),
  type: yup.string().oneOf(["options", "file"]).required("Type is required"),
  active: booleanFlag().default(true),
  sortOrder: sortOrder(),
  price: yup
    .number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined ? null : value,
    )
    .nullable()
    .min(0)
    .when("type", {
      is: "file",
      then: (schema) => schema.required("Price is required"),
      otherwise: (schema) => schema.optional(),
    }),
  color: colorId().when("type", {
    is: "file",
    then: (schema) => schema.required("Color is required"),
    otherwise: (schema) => schema.optional().nullable(),
  }),
  allowFile: booleanFlag().default(false),
  options: yup
    .array()
    .of(optionSchema)
    .when("type", {
      is: "options",
      then: (schema) => schema.min(1, "At least one option is required").required(),
      otherwise: (schema) => schema.optional(),
    }),
});

export const updateIndependentServiceSchema = createIndependentServiceSchema;
