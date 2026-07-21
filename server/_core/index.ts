import "dotenv/config";
import { createServer } from "http";
import { createEeosApp } from "./app";
import { assertCoreProductionConfig } from "./startup";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  assertCoreProductionConfig();
  const app = createEeosApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || 3000);
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
