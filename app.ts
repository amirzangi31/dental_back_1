import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import { xss } from "express-xss-sanitizer";
import cors from "cors";
import path from "path";
import winston from "winston";

// Routes
import swaggerRoutes from "./modules/v1/apiDoc/swagger.routes";
import authRoutes from "./modules/v1/auth/auth.routes";
import catalogRoutes from "./modules/v1/catalog/catalog.routes";
import categoryRoutes from "./modules/v1/category/category.routes";
import userRoutes from "./modules/v1/users/user.routes";
import colorRoutes from "./modules/v1/color/color.routes";
import deviceRoutes from "./modules/v1/device/device.routes";
import volumeRoutes from "./modules/v1/volume/volume.routes";
import materialShadeRoutes from "./modules/v1/materialshade/materialshade.routes";
import categorycolorRoutes from "./modules/v1/categorycolor/categorycolor.routes";
import orderRoutes from "./modules/v1/order/order.routes";
import vipRoutes from "./modules/v1/vip/vip.routes";
import taxRoutes from "./modules/v1/tax/tax.routes";
import ticketRoutes from "./modules/v1/tickets/ticket.routes";
import paymentRoutes from "./modules/v1/payment/payment.routes";
import materialRoutes from "./modules/v1/material/material.route";
import materialCategoryRoutes from "./modules/v1/materialcategory/materialcategory.route";

// Middleware
import { setHeaders } from "./middleware/headers";

const app = express();

/* =======================
   WINSTON LOGGER
======================= */
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      (info) => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/* =======================
   SECURITY MIDDLEWARES
======================= */
// Custom headers (must be before sanitize to handle OPTIONS early)
app.use(setHeaders);

// Body parser with limit
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Fix for Express 5: Make req.query writable for mongoSanitize
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  // Convert req.query to a writable object for Express 5 compatibility
  try {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch (err) {
    // If already writable, continue
  }
  next();
});

// Sanitize Mongo queries
app.use(mongoSanitize());

// XSS protection
app.use(xss());

// Helmet
app.use(
  helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

// CORS
const allowedOrigins = ["http://localhost:3000" , "https://my.digitda.de"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// Disable x-powered-by in production
if (process.env.NODE_ENV === "production") {
  app.disable("x-powered-by");
}

// Dev-only debug logger
if (process.env.NODE_ENV !== "production") {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(req.method, req.path, req.body);
    next();
  });
}

/* =======================
   STATIC FILES (SECURE)
======================= */
// Use process.cwd() for better compatibility with ts-node
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

/* =======================
   ROUTES
======================= */
app.use("/api-docs", swaggerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/color", colorRoutes);
app.use("/api/categorycolor", categorycolorRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/volume", volumeRoutes);
app.use("/api/material", materialRoutes);
app.use("/api/materialcategory", materialCategoryRoutes);
app.use("/api/materialshade", materialShadeRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/materialshade", materialShadeRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/tax", taxRoutes);
app.use("/api/payment", paymentRoutes);

/* =======================
   404 HANDLER
======================= */
app.use((req: Request, res: Response) => {
  logger.warn(`404 Path Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    message: "404! Path Not Found. Please check the path/method",
  });
});

/* =======================
   GLOBAL ERROR HANDLER
======================= */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${err.message} - ${req.method} ${req.path}`);
  res.status(500).json({ message: "Internal Server Error" });
});

export default app;
  