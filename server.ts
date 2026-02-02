import { configDotenv } from "dotenv";
import app from "./app";
import { startCleanupOrdersJob } from "./jobs/cleanupOrders.job";

//* Load ENV
const productionMode = process.env.NODE_ENV === "production";
if (!productionMode) {
  configDotenv();
}

async function startServer() {
  const port = process.env.PORT || 4002;
  startCleanupOrdersJob();
  app.listen(port, () => {
    console.log(
      `Server running in ${
        productionMode ? "production" : "development"
      } mode on port ${port}`
    );
  });
}

async function run() {
  await startServer();
}

run();
