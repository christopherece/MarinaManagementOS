import cors from "cors";
import express from "express";
import { errorHandler } from "./http.js";
import { berths } from "./modules/berths.js";
import { customers } from "./modules/customers.js";
import { agreements } from "./modules/agreements.js";
import { billing } from "./modules/billing.js";
import { receivables } from "./modules/receivables.js";
import { reports } from "./modules/reports.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  for (const r of [berths, customers, agreements, billing, receivables, reports]) app.use("/api", r);
  app.use(errorHandler);
  return app;
}
