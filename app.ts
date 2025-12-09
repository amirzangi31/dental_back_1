import express, { Request, Response } from "express";
import swaggerRoutes from "./modules/v1/apiDoc/swagger.routes";
import authRoutes from "./modules/v1/auth/auth.routes";
import catalogRoutes from "./modules/v1/catalog/catalog.routes";
import categoryRoutes from "./modules/v1/category/category.routes";
import userRoutes from "./modules/v1/users/user.routes";
import colorRoutes from "./modules/v1/color/color.routes";
import additionalscanRoutes from "./modules/v1/additionalscan/additionalscan.routes";
import deviceRoutes from "./modules/v1/device/device.routes";
import volumeRoutes from "./modules/v1/volume/volume.routes";
import materialShadeRoutes from "./modules/v1/materialshade/materialshade.routes";
import implantAttributeRoutes from "./modules/v1/implantattribute/implantattribute.routes";
import { setHeaders } from "./middleware/headers";
import categorycolorRoutes from "./modules/v1/categorycolor/categorycolor.routes";
import implantRoutes from "./modules/v1/implant/implant.routes";
import orderRoutes from "./modules/v1/order/order.routes";
import vipRoutes from "./modules/v1/vip/vip.routes";
import ticketRoutes from "./modules/v1/tickets/ticket.routes";
const app = express();
app.use(express.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set headers
app.use(setHeaders);


// Swagger routes
app.use("/api-docs", swaggerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/color", colorRoutes);
app.use("/api/categorycolor", categorycolorRoutes);
app.use("/api/additionalscan", additionalscanRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/volume", volumeRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/implant", implantRoutes);
app.use("/api/materialshade", materialShadeRoutes);
app.use("/api/implantattribute", implantAttributeRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/vip", vipRoutes);
app.use("/uploads", express.static("uploads"));
app.use((req: Request, res: Response) => {
  console.log("this path is not found:", req.path);
  return res
    .status(404)
    .json({ message: "404! Path Not Found. Please check the path/method" });
});

// TODO: Needed Feature
app.use((req, res) => {
  console.log(req);
  console.log(req);
});

export default app;
