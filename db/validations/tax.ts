import * as yup from "yup";

export const createTaxSchema = yup.object().shape({
  title: yup.string().required("title is required"),
  percent: yup.string().required("percent is required"),
});

export const updateTaxSchema = yup.object().shape({
  title: yup.string().required("title is required"),
  percent: yup.string().required("percent is required"),
});
