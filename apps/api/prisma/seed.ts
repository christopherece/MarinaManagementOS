/**
 * Sample data for a local development database. Safe to run more than once.
 * Creates the three Auckland marinas, berth types, a few piers and berths,
 * and the first admin user from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Never point this at a real database.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth.js";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!email || password.length < 10) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (10+ characters) in apps/api/.env");
  }

  const marinas = [
    { code: "WH", name: "Westhaven Marina" },
    { code: "VM", name: "Viaduct Marina" },
    { code: "SM", name: "Silo Marina" },
  ];
  for (const m of marinas) await prisma.marina.upsert({ where: { code: m.code }, update: {}, create: m });

  const types = ["Marina Berth", "Pile", "Swing Mooring", "Hardstand"];
  for (const name of types) await prisma.berthType.upsert({ where: { name }, update: {}, create: { name } });

  const wh = await prisma.marina.findUniqueOrThrow({ where: { code: "WH" } });
  const marinaBerth = await prisma.berthType.findUniqueOrThrow({ where: { name: "Marina Berth" } });
  for (const pierName of ["A", "B", "C"]) {
    const pier = await prisma.pier.upsert({
      where: { marinaId_name: { marinaId: wh.id, name: pierName } },
      update: {},
      create: { marinaId: wh.id, name: pierName },
    });
    for (let i = 1; i <= 10; i++) {
      const name = `${pierName}${i}`;
      await prisma.berth.upsert({
        where: { marinaId_name: { marinaId: wh.id, name } },
        update: {},
        create: { marinaId: wh.id, pierId: pier.id, typeId: marinaBerth.id, name, nominalLengthM: 10 + (i % 5) * 2, nominalWidthM: 4 + (i % 3) },
      });
    }
  }

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", role: "ADMIN", passwordHash: await hashPassword(password) },
  });
  console.log(`Seeded 3 marinas, ${types.length} berth types, 30 Westhaven berths and admin ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
