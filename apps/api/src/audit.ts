import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

/** Records who changed what. A failure is logged and never blocks the change. */
export async function audit(req: Request, entity: string, entityId: string, action: string, changes?: unknown) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        entity,
        entityId,
        action,
        changes: changes === undefined ? Prisma.JsonNull : (JSON.parse(JSON.stringify(changes)) as Prisma.InputJsonValue),
      },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
