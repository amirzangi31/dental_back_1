import * as yup from "yup";

export const createVolumeSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  start: yup.number(),
  end: yup.number(),
  price: yup.number(),
});

export const updateVolumeSchema = yup.object().shape({
  title: yup.string(),
  start: yup.number(),
  end: yup.number(),
  price: yup.number(),
});

