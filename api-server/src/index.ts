import { createServer } from "http";
import app from "./app";
import { attachSocketIO } from "./lib/socket-server";
import { logger } from "./lib/logger";

// Use Railway's injected port in prod, fall back for local dev
const port = Number(process.env.PORT ?? 3000);

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

const host = "0.0.0.0"; // important in containerized hosts

const httpServer = createServer(app);

// Attach Socket.IO to the same HTTP server
attachSocketIO(httpServer);

// Helpful process-level error logging
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

// Graceful shutdown for container lifecycle (optional)
const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutting down server");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force-exit after timeout if something hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

httpServer.on("error", (err) => {
  logger.error({ err }, "Server error");
  // Let Railway know the process failed so it can restart
  process.exit(1);
});

httpServer.listen(port, host, () => {
  logger.info({ port, host }, "Server listening");
});
