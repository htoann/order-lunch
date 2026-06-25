"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

export async function getOrCreateSession(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00.000Z");
  let session = await prisma.orderSession.findUnique({ where: { date } });
  if (!session) {
    session = await prisma.orderSession.create({ data: { date } });
  }
  return session;
}

export async function upsertOrder(
  sessionId: number,
  memberId: number,
  dishId: number | null
) {
  const existing = await prisma.order.findFirst({
    where: { sessionId, memberId },
  });

  if (dishId === null) {
    if (existing) {
      await prisma.order.delete({ where: { id: existing.id } });
    }
    revalidatePath("/");
    return null;
  }

  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish) return null;

  if (existing) {
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { dishId, unitPrice: dish.price },
    });
    revalidatePath("/");
    return updated;
  }

  const order = await prisma.order.create({
    data: {
      sessionId,
      memberId,
      dishId,
      unitPrice: dish.price,
    },
  });
  revalidatePath("/");
  return order;
}

export async function togglePaid(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { paid: !order.paid },
  });
  revalidatePath("/");
}

export async function addMember(name: string) {
  if (!name.trim()) return;
  await prisma.member.create({ data: { name: name.trim() } });
  revalidatePath("/");
}

export async function addDish(name: string, price: number) {
  if (!name.trim() || price <= 0) return;
  await prisma.dish.create({ data: { name: name.trim(), price } });
  revalidatePath("/");
}

export async function getDebt(memberId: number, beforeDate: Date) {
  const result = await prisma.order.aggregate({
    where: {
      memberId,
      paid: false,
      session: { date: { lt: beforeDate } },
    },
    _sum: { unitPrice: true },
  });
  return result._sum.unitPrice || 0;
}

export async function getSessionData(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00.000Z");

  const session = await prisma.orderSession.findUnique({
    where: { date },
    include: {
      orders: {
        include: { member: true, dish: true },
      },
    },
  });

  const members = await prisma.member.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
  });

  const dishes = await prisma.dish.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
  });

  const debts: Record<number, number> = {};
  for (const member of members) {
    debts[member.id] = await getDebt(member.id, date);
  }

  return { session, members, dishes, debts };
}
