import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the database: just the calls these routes make.
const db = vi.hoisted(() => ({
  users: [] as { id: string; email: string; name: string; role: string; active: boolean; passwordHash: string }[],
  sessions: [] as { id: string; userId: string; expiresAt: Date }[],
  berthsCreated: 0,
}));

vi.mock("../src/db.js", () => ({
  prisma: {
    user: { findUnique: async ({ where }: { where: { email: string } }) => db.users.find((u) => u.email === where.email) ?? null },
    session: {
      create: async ({ data }: { data: { id: string; userId: string; expiresAt: Date } }) => {
        db.sessions.push(data);
        return data;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const s = db.sessions.find((x) => x.id === where.id);
        return s ? { ...s, user: db.users.find((u) => u.id === s.userId)! } : null;
      },
      deleteMany: async ({ where }: { where: { id: string } }) => {
        db.sessions = db.sessions.filter((s) => s.id !== where.id);
        return { count: 1 };
      },
    },
    berth: {
      findMany: async () => [],
      create: async ({ data }: { data: object }) => {
        db.berthsCreated++;
        return { id: "b1", ...data };
      },
    },
    auditLog: { create: async () => ({}) },
  },
}));

const { createApp } = await import("../src/app.js");
const { hashPassword } = await import("../src/auth.js");

const PASSWORD = "test-password-123";

beforeAll(async () => {
  const passwordHash = await hashPassword(PASSWORD);
  db.users.push(
    { id: "u1", email: "office@test.local", name: "Office", role: "BERTH_OFFICE", active: true, passwordHash },
    { id: "u2", email: "viewer@test.local", name: "Viewer", role: "READ_ONLY", active: true, passwordHash },
    { id: "u3", email: "gone@test.local", name: "Gone", role: "ADMIN", active: false, passwordHash },
  );
});

beforeEach(() => {
  db.sessions = [];
  db.berthsCreated = 0;
});

async function signIn(email: string) {
  const agent = request.agent(createApp());
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

const berth = { marinaId: "m1", typeId: "t1", name: "A1", nominalLengthM: 12 };

describe("sign-in", () => {
  it("rejects a wrong password and a disabled user with the same message", async () => {
    const app = createApp();
    const wrong = await request(app).post("/api/auth/login").send({ email: "office@test.local", password: "nope" });
    const disabled = await request(app).post("/api/auth/login").send({ email: "gone@test.local", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(disabled.status).toBe(401);
    expect(wrong.body.error).toBe(disabled.body.error);
  });

  it("sets an httpOnly session cookie and returns the user", async () => {
    const res = await request(createApp()).post("/api/auth/login").send({ email: "Office@Test.local", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("BERTH_OFFICE");
    expect(String(res.headers["set-cookie"])).toMatch(/mmos_session=.*HttpOnly/);
  });

  it("blocks data routes without a session", async () => {
    const res = await request(createApp()).get("/api/berths");
    expect(res.status).toBe(401);
  });

  it("ends the session on logout", async () => {
    const agent = await signIn("office@test.local");
    expect((await agent.get("/api/auth/me")).status).toBe(200);
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});

describe("roles", () => {
  it("lets every role read", async () => {
    const agent = await signIn("viewer@test.local");
    expect((await agent.get("/api/berths")).status).toBe(200);
  });

  it("stops a read-only user changing data", async () => {
    const agent = await signIn("viewer@test.local");
    const res = await agent.post("/api/berths").send(berth);
    expect(res.status).toBe(403);
    expect(db.berthsCreated).toBe(0);
  });

  it("lets the berth office add a berth", async () => {
    const agent = await signIn("office@test.local");
    const res = await agent.post("/api/berths").send(berth);
    expect(res.status).toBe(201);
    expect(db.berthsCreated).toBe(1);
  });

  it("stops the berth office starting a billing run", async () => {
    const agent = await signIn("office@test.local");
    const res = await agent.post("/api/billing-runs").send({ periodFrom: "2026-11-01", periodTo: "2026-11-30" });
    expect(res.status).toBe(403);
  });
});
