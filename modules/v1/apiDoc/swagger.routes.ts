import express from "express";
import swaggerUi from "swagger-ui-express";
import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

const swaggerOptions = {
  customCss: ".swagger-ui .topbar { display: none };",
  customSiteTitle: "Dental API Documentation",
  customfavIcon: "https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/favicon-32x32.png",
  swaggerOptions: {
    docExpansion: "none",
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  },
};

// Always read the latest version of swagger.json from disk
const getSwaggerDocument = () => {
  const filePath = path.join(__dirname, "swagger.json");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
};

router.use("/", swaggerUi.serve);
router.get("/", (req: Request, res: Response, next: NextFunction) => {
  const swaggerDocument = getSwaggerDocument();
  return swaggerUi.setup(swaggerDocument, swaggerOptions)(req, res, next);
});

router.get("/docs", (req: Request, res: Response) => {
  res.redirect("/");
});

router.get("/swagger.json", (req: Request, res: Response) => {
  const swaggerDocument = getSwaggerDocument();
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerDocument);
});

export default router;
