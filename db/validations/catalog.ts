import * as yup from "yup";

export const createCatalogSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
});

export const updateCatalogSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
});