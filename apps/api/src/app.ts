import cors from "cors";
import express from "express";
import { errorHandler } from "./http.js";
import { requireAuth } from "./auth.js";
import { auth } from "./modules/auth.js";
import { berths } from "./modules/berths.js";
import { customers } from "./modules/customers.js";
import { agreements } from "./modules/agreements.js";
import { billing } from "./modules/billing.js";
import { receivables } from "./modules/receivables.js";
import { reports } from "./modules/reports.js";

export function createApp() {
  const app = express();
  // Only the web app's own origin may call the API from a browser.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", auth);

  // Everything below needs a signed-in user. Every role can read; each
  // module limits who can change data, route by route (ADMIN always can).
  app.use("/api", requireAuth);
  app.use("/api", berths);
  app.use("/api", customers);
  app.use("/api", agreements);
  app.use("/api", billing);
  app.use("/api", receivables);
  app.use("/api", reports);
  app.use(errorHandler);
  return app;
}
