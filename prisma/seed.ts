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

  const dishes = [
    { name: "Món 1", price: 33000 },
    { name: "Món 2", price: 33000 },
    { name: "Món 3", price: 33000 },
  ];

  for (const dish of dishes) {
    const existing = await prisma.dish.findFirst({
      where: { name: dish.name },
    });
    if (!existing) {
      await prisma.dish.create({ data: dish });
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
