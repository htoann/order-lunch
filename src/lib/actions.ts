"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";

const UNIT_PRICE = 35;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "claytran";

// Members who never carry a running debt — the owner settles the bill directly,
// so their "Tổng nợ cũ" is always 0 regardless of their orders.
const DEBT_EXEMPT_NAMES = new Set(["Clay"]);

// Record a human-readable line in the activity history. `action` is a category
// slug (order/member/dish/paid/debt/bill/image) used for the icon in the UI.
// Logging must never break the underlying action, so failures are swallowed.
async function logActivity(action: string, detail: string) {
  try {
    await prisma.activity.create({ data: { action, detail } });
  } catch {
    // ignore
  }
}

// Amounts are stored in thousands of VND; show them compactly as e.g. "35k".
const k = (n: number) => `${n}k`;

// Display an ISO date string (YYYY-MM-DD) as dd/mm/yyyy.
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export async function verifyAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export async function updateMember(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const before = await prisma.member.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.member.update({
    where: { id },
    data: { name: trimmed },
  });
  await logActivity(
    "member",
    before && before.name !== trimmed
      ? `Đổi tên thành viên "${before.name}" → "${trimmed}"`
      : `Cập nhật thành viên "${trimmed}"`,
  );
  revalidatePath("/");
}

export async function deleteMember(id: string) {
  const m = await prisma.member.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.member.update({
    where: { id },
    data: { active: false },
  });
  await logActivity("member", `Xóa thành viên "${m?.name ?? "?"}"`);
  revalidatePath("/");
}

export async function updateDish(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const before = await prisma.dish.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.dish.update({
    where: { id },
    data: { name: trimmed },
  });
  await logActivity(
    "dish",
    before && before.name !== trimmed
      ? `Đổi tên món "${before.name}" → "${trimmed}"`
      : `Cập nhật món "${trimmed}"`,
  );
  revalidatePath("/");
}

export async function deleteDish(id: string) {
  const d = await prisma.dish.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.dish.update({
    where: { id },
    data: { active: false },
  });
  await logActivity("dish", `Xóa món "${d?.name ?? "?"}"`);
  revalidatePath("/");
}

export async function deleteOrder(orderId: string) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      member: { select: { name: true } },
      dish: { select: { name: true } },
    },
  });
  await prisma.order.delete({ where: { id: orderId } });
  if (o) {
    await logActivity("order", `Xóa order của "${o.member.name}" (${o.dish.name})`);
  }
  revalidatePath("/");
}

export async function updateOrderUnitPrice(orderId: string, unitPrice: number) {
  if (unitPrice < 0) return;
  const o = await prisma.order.update({
    where: { id: orderId },
    data: { unitPrice },
    include: { member: { select: { name: true } } },
  });
  await logActivity(
    "order",
    `Sửa đơn giá của "${o.member.name}" thành ${k(unitPrice)}`,
  );
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
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { name: true },
  });
  const mName = member?.name ?? "?";

  if (dishId === null) {
    if (existing) {
      await prisma.order.delete({ where: { id: existing.id } });
      await logActivity("order", `"${mName}" bỏ chọn món`);
    }
    revalidatePath("/");
    return null;
  }

  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    select: { name: true },
  });
  const dName = dish?.name ?? "?";

  if (existing) {
    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: { dishId, unitPrice: UNIT_PRICE },
    });
    await logActivity("order", `"${mName}" đổi món → "${dName}"`);
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
  await logActivity("order", `"${mName}" chọn món "${dName}"`);
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
  await logActivity(
    "bill",
    totalBill == null
      ? `Xóa tổng bill ngày ${fmtDate(dateStr)}`
      : `Cập nhật tổng bill ngày ${fmtDate(dateStr)}: ${k(totalBill)}`,
  );
  revalidatePath("/");
}

export async function setMemberPaid(
  memberId: string,
  dateStr: string,
  paid: boolean,
) {
  const date = new Date(dateStr + "T00:00:00.000Z");
  // Mark when the member settled up. On the payment day the old debt is still
  // shown (struck through); from the next day it reads as 0. Settling also
  // clears any manual debt override so the payment isn't masked by it.
  const m = await prisma.member.update({
    where: { id: memberId },
    data: {
      debtPaidOn: paid ? date : null,
      ...(paid ? { debtOverride: null } : {}),
    },
    select: { name: true },
  });
  await logActivity(
    "paid",
    paid
      ? `"${m.name}" đã thanh toán (${fmtDate(dateStr)})`
      : `"${m.name}" bỏ thanh toán (${fmtDate(dateStr)})`,
  );
  revalidatePath("/");
}

export async function addMember(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await prisma.member.create({ data: { name: trimmed } });
  await logActivity("member", `Thêm thành viên "${trimmed}"`);
  revalidatePath("/");
}

export async function addDish(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await prisma.dish.create({ data: { name: trimmed } });
  await logActivity("dish", `Thêm món "${trimmed}"`);
  revalidatePath("/");
}

export async function updateMemberDebt(
  memberId: string,
  debt: number | null,
  dateStr: string,
) {
  // A manual debt is a baseline "as of" the day it's entered: from this day on,
  // that amount is owed and each later day's meal accumulates on top. Setting it
  // also un-settles the member (a fresh amount is owed again). Clearing it (null)
  // drops the baseline and its anchor too.
  const anchor = debt == null ? null : new Date(dateStr + "T00:00:00.000Z");
  const m = await prisma.member.update({
    where: { id: memberId },
    data: { debtOverride: debt, debtOverrideOn: anchor, debtPaidOn: null },
    select: { name: true },
  });
  await logActivity(
    "debt",
    debt == null
      ? `Đặt nợ của "${m.name}" về tự tính`
      : `Cập nhật nợ của "${m.name}": ${k(debt)} (từ ${fmtDate(dateStr)})`,
  );
  revalidatePath("/");
}

export async function getDebt(
  memberId: string,
  beforeDate: Date,
  debtOverride?: number | null,
  debtPaidOn?: Date | null,
  debtOverrideOn?: Date | null,
) {
  // Debt is a running ledger: pick the most recent "reset point", take its
  // baseline, then add every day's own meal ("Thành tiền") from that point up to
  // (but not including) the viewed day. So an *unpaid* debt keeps growing day by
  // day — next day's debt = old debt + yesterday's Thành tiền.
  //
  // There are two kinds of reset point:
  //   • Payment (debtPaidOn): baseline 0. It only takes effect the day *after*
  //     settling — on the settle day the pre-payment debt still shows (struck
  //     through in the UI), then drops to just that day's meal onward.
  //   • Manual override (debtOverride entered on debtOverrideOn): baseline is the
  //     entered amount, effective from that day onward (including it). Later days'
  //     meals accumulate on top, so a hand-entered debt still rolls forward.
  const paymentActive = debtPaidOn != null && beforeDate > debtPaidOn;
  const overrideActive =
    debtOverride != null && debtOverrideOn != null && beforeDate >= debtOverrideOn;

  // The later reset point wins. On a tie, payment wins (settling supersedes the
  // now-stale pre-payment figure).
  let anchorDate: Date | null = null;
  let baseline = 0;
  if (
    overrideActive &&
    (!paymentActive || (debtOverrideOn as Date) > (debtPaidOn as Date))
  ) {
    anchorDate = debtOverrideOn as Date;
    baseline = debtOverride as number;
  } else if (paymentActive) {
    anchorDate = debtPaidOn as Date;
    baseline = 0;
  }

  const sessions = await prisma.orderSession.findMany({
    where: {
      date: { lt: beforeDate, ...(anchorDate ? { gte: anchorDate } : {}) },
      orders: { some: { memberId } },
    },
    include: { orders: { select: { memberId: true, unitPrice: true } } },
  });

  let total = baseline;
  for (const s of sessions) {
    const memberOrder = s.orders.find((o) => o.memberId === memberId);
    if (!memberOrder) continue;
    // Each day contributes the real per-person share (bill split), falling back
    // to the order's unit price when no total bill was entered that day.
    total +=
      s.totalBill != null && s.orders.length > 0
        ? Math.ceil(s.totalBill / s.orders.length)
        : memberOrder.unitPrice;
  }
  return total;
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
  await logActivity("image", `Tải ảnh lên ngày ${fmtDate(dateStr)}`);
  revalidatePath("/");
}

export async function deleteSessionImage(imageId: string) {
  await prisma.sessionImage.delete({ where: { id: imageId } });
  await logActivity("image", `Xóa ảnh`);
  revalidatePath("/");
}

export async function getActivities(limit = 50) {
  const items = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return items.map((a) => ({
    id: a.id,
    action: a.action,
    detail: a.detail,
    ts: a.createdAt.getTime(),
  }));
}

export async function clearActivities() {
  await prisma.activity.deleteMany({});
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
        [
          m.id,
          DEBT_EXEMPT_NAMES.has(m.name)
            ? 0
            : await getDebt(m.id, date, m.debtOverride, m.debtPaidOn, m.debtOverrideOn),
        ] as const
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
