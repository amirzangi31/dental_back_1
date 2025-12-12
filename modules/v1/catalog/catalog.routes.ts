import express from "express";
import { auth } from "../../../middleware/auth";
import {
  catalogDropDown,
  createCatalog,
  deleteCatalog,
  getCatalog,
  getCatalogWithCategory,
  updateCatalog,
} from "./catalog.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  createCatalogSchema,
  updateCatalogSchema,
} from "../../../db/validations/catalog";

const router = express.Router();

router.get("/catalogs", auth, getCatalog);
router.get("/catalogs-with-category", auth, getCatalogWithCategory);  
router.get("/catalogs/dropdown", auth, catalogDropDown);
router.post("/catalog", auth, validate(createCatalogSchema), createCatalog);
router.put("/catalog/:id", auth, validate(updateCatalogSchema) , updateCatalog);
router.delete("/catalog/:id", auth, deleteCatalog);

export default router;
