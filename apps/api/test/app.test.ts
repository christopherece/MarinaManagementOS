import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("api", () => {
  it("answers health without a database", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects invalid input before touching the database", async () => {
    const res = await request(createApp()).post("/api/agreements").send({ type: "NOPE" });
    expect(res.status).toBe(400);
  });
});
