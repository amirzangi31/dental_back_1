import { configDotenv } from "dotenv";
import app from "./app";

//* Load ENV
const productionMode = process.env.NODE_ENV === "production";
if (!productionMode) {
  configDotenv();
}

async function startServer() {
  const port = process.env.PORT || 4002;
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
