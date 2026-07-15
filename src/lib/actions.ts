"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";

const UNIT_PRICE = 35;
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

export async function updateDish(id: string, name: string) {
  if (!name.trim()) return;
  await prisma.dish.update({
    where: { id },
    data: { name: name.trim() },
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

export async function setMemberPaid(
  memberId: string,
  dateStr: string,
  paid: boolean,
) {
  const date = new Date(dateStr + "T00:00:00.000Z");
  // Mark when the member settled up. On the payment day the old debt is still
  // shown (struck through); from the next day it reads as 0.
  await prisma.member.update({
    where: { id: memberId },
    data: { debtPaidOn: paid ? date : null },
  });
  // Keep the order's paid flag in sync when the member has an order that day
  // (so the auto-accumulated debt stays correct).
  const session = await prisma.orderSession.findUnique({ where: { date } });
  if (session) {
    const order = await prisma.order.findFirst({
      where: { sessionId: session.id, memberId },
    });
    if (order) {
      await prisma.order.update({ where: { id: order.id }, data: { paid } });
    }
  }
  revalidatePath("/");
}

export async function addMember(name: string) {
  if (!name.trim()) return;
  await prisma.member.create({ data: { name: name.trim() } });
  revalidatePath("/");
}

export async function addDish(name: string) {
  if (!name.trim()) return;
  await prisma.dish.create({ data: { name: name.trim() } });
  revalidatePath("/");
}

export async function updateMemberDebt(memberId: string, debt: number | null) {
  // Setting a new debt un-settles the member (a fresh amount is owed again).
  await prisma.member.update({
    where: { id: memberId },
    data: { debtOverride: debt, debtPaidOn: null },
  });
  revalidatePath("/");
}

export async function getDebt(
  memberId: string,
  beforeDate: Date,
  debtOverride?: number | null,
  debtPaidOn?: Date | null,
) {
  // Once settled on a prior day, the old debt reads as 0.
  if (debtPaidOn != null && debtPaidOn < beforeDate) return 0;

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

export async function addFeedback(message: string, name?: string) {
  const trimmed = message.trim();
  if (!trimmed) return;
  const trimmedName = name?.trim();
  await prisma.feedback.create({
    data: {
      message: trimmed,
      name: trimmedName ? trimmedName : null,
    },
  });
}

export async function getFeedbacks() {
  return prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteFeedback(id: string) {
  await prisma.feedback.delete({ where: { id } });
}

export async function getSessionData(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00.000Z");

  const [session, members, dishes] = await Promise.all([
    prisma.orderSession.findUnique({
      where: { date },
      include: {
        orders: {
          include: { member: true, dish: true },
        },
        images: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.member.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    }),
    prisma.dish.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const debtEntries = await Promise.all(
    members.map(
      async (m) =>
        [m.id, await getDebt(m.id, date, m.debtOverride, m.debtPaidOn)] as const
    )
  );
  const debts: Record<string, number> = Object.fromEntries(debtEntries);

  // A member counts as "paid" for this date when they settled on this exact day.
  const paid: Record<string, boolean> = Object.fromEntries(
    members.map(
      (m) =>
        [m.id, m.debtPaidOn != null && m.debtPaidOn.getTime() === date.getTime()] as const
    )
  );

  return { session, members, dishes, debts, paid };
}
