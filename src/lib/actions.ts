"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";

const UNIT_PRICE = 35000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "claytran";

export async function verifyAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export async function updateMember(id: string, name: string) {
  if (!name.trim()) return;
  await prisma.member.update({
    where: { id },
    data: { name: name.trim() },
  });
  revalidatePath("/");
}

export async function deleteMember(id: string) {
  await prisma.member.update({
    where: { id },
    data: { active: false },
  });
  revalidatePath("/");
}

export async function updateDish(id: string, name: string, price: number) {
  if (!name.trim() || price <= 0) return;
  await prisma.dish.update({
    where: { id },
    data: { name: name.trim(), price },
  });
  revalidatePath("/");
}

export async function deleteDish(id: string) {
  await prisma.dish.update({
    where: { id },
    data: { active: false },
  });
  revalidatePath("/");
}

export async function deleteOrder(orderId: string) {
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/");
}

export async function updateOrderUnitPrice(orderId: string, unitPrice: number) {
  if (unitPrice < 0) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { unitPrice },
  });
  revalidatePath("/");
}

export async function getOrCreateSession(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00.000Z");
  let session = await prisma.orderSession.findUnique({ where: { date } });
  if (!session) {
    session = await prisma.orderSession.create({ data: { date } });
  }
  return session;
}

export async function upsertOrder(
  sessionId: string,
  memberId: string,
  dishId: string | null,
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

  if (existing) {
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { dishId, unitPrice: UNIT_PRICE },
    });
    revalidatePath("/");
    return updated;
  }

  const order = await prisma.order.create({
    data: {
      sessionId,
      memberId,
      dishId,
      unitPrice: UNIT_PRICE,
    },
  });
  revalidatePath("/");
  return order;
}

export async function updateTotalBill(
  dateStr: string,
  totalBill: number | null,
) {
  const session = await getOrCreateSession(dateStr);
  await prisma.orderSession.update({
    where: { id: session.id },
    data: { totalBill },
  });
  revalidatePath("/");
}

export async function togglePaid(orderId: string) {
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

export async function updateMemberDebt(memberId: string, debt: number | null) {
  await prisma.member.update({
    where: { id: memberId },
    data: { debtOverride: debt },
  });
  revalidatePath("/");
}

export async function getDebt(memberId: string, beforeDate: Date, debtOverride?: number | null) {
  if (debtOverride != null) return debtOverride;

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

export async function uploadSessionImage(
  dateStr: string,
  data: string,
  filename: string,
) {
  const session = await getOrCreateSession(dateStr);
  await prisma.sessionImage.create({
    data: { sessionId: session.id, data, filename },
  });
  revalidatePath("/");
}

export async function deleteSessionImage(imageId: string) {
  await prisma.sessionImage.delete({ where: { id: imageId } });
  revalidatePath("/");
}

export async function getSessionData(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00.000Z");

  const session = await prisma.orderSession.findUnique({
    where: { date },
    include: {
      orders: {
        include: { member: true, dish: true },
      },
      images: {
        orderBy: { createdAt: "asc" },
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

  const debts: Record<string, number> = {};
  for (const member of members) {
    debts[member.id] = await getDebt(member.id, date);
  }

  return { session, members, dishes, debts };
}
