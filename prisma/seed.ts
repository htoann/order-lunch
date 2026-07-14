import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const members = [
    "Clay", "Max", "Rico", "Nika", "Lythe",
    "Kieran", "Sao", "Aveline", "Reed", "Lila",
    "Crispin", "Nia",
  ];

  for (const name of members) {
    await prisma.member.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const dishes = ["Món 1", "Món 2", "Món 3"];

  for (const name of dishes) {
    const existing = await prisma.dish.findFirst({ where: { name } });
    if (!existing) {
      await prisma.dish.create({ data: { name } });
    }
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
