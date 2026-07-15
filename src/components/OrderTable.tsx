"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getOrCreateSession,
  upsertOrder,
  setMemberPaid,
  updateTotalBill,
  updateOrderUnitPrice,
  updateMemberDebt,
} from "@/lib/actions";
import { useAdmin } from "./AdminProvider";
import { useToast } from "./ToastProvider";

type Member = { id: string; name: string };
type Dish = { id: string; name: string };
type Order = {
  id: string;
  memberId: string;
  dishId: string;
  unitPrice: number;
  paid: boolean;
  member: Member;
  dish: Dish;
};
type Session = { id: string; totalBill: number | null; orders: Order[] } | null;

export default function OrderTable({
  dateStr,
  session,
  members,
  dishes,
  debts,
  paid,
}: {
  dateStr: string;
  session: Session;
  members: Member[];
  dishes: Dish[];
  debts: Record<string, number>;
  paid: Record<string, boolean>;
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [, startTransition] = useTransition();
  const { promise } = useToast();
  const [billInput, setBillInput] = useState(
    session?.totalBill?.toString() ?? ""
  );
  // Optimistic values keep the server value they were based on. The optimistic
  // value is shown only until the refreshed server data moves off that base —
  // clearing it any sooner causes a tick -> untick -> tick flicker.
  const [optimisticPaid, setOptimisticPaid] = useState<
    Record<string, { value: boolean; base: boolean }>
  >({});
  const [optimisticDish, setOptimisticDish] = useState<
    Record<string, { value: string | null; base: string | null }>
  >({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editDebtValue, setEditDebtValue] = useState("");

  const orderMap = new Map<string, Order>();
  if (session) {
    for (const order of session.orders) {
      orderMap.set(order.memberId, order);
    }
  }

  // Show the optimistic value until the refreshed server data diverges from the
  // base it was captured against; then trust the server.
  function effectivePaid(memberId: string): boolean {
    const server = paid[memberId] ?? false;
    const opt = optimisticPaid[memberId];
    return opt && opt.base === server ? opt.value : server;
  }

  function effectiveDish(memberId: string): string | null {
    const server = orderMap.get(memberId)?.dishId ?? null;
    const opt = optimisticDish[memberId];
    return opt && opt.base === server ? opt.value : server;
  }

  const orderCount = orderMap.size;
  const perPerson =
    session?.totalBill && orderCount > 0
      ? Math.ceil(session.totalBill / orderCount)
      : null;

  const dishCounts: Record<string, number> = {};
  for (const order of orderMap.values()) {
    dishCounts[order.dishId] = (dishCounts[order.dishId] || 0) + 1;
  }
  const sortedDishCounts = dishes
    .filter((d) => dishCounts[d.id])
    .map((d) => ({ id: d.id, name: d.name, count: dishCounts[d.id] }));

  const totalThanhTien = perPerson ? perPerson * orderCount : 0;
  const totalDonGia = Array.from(orderMap.values()).reduce(
    (sum, o) => sum + o.unitPrice,
    0
  );
  const paidCount = members.filter((m) => effectivePaid(m.id)).length;
  // Exclude debts already settled (member ticked paid) so the total drops as
  // soon as a row is settled, matching the struck-through per-row display.
  const totalDebt = members.reduce(
    (sum, m) => (effectivePaid(m.id) ? sum : sum + (debts[m.id] || 0)),
    0
  );

  const ROW_COLORS = [
    "#dbeafe", "#fce7f3", "#d1fae5", "#fef3c7",
    "#ede9fe", "#ccfbf1", "#fee2e2", "#e0e7ff",
  ];

  function clearOptimisticDish(memberId: string) {
    setOptimisticDish((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }

  function clearOptimisticPaid(memberId: string) {
    setOptimisticPaid((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }

  async function handleDishChange(memberId: string, dishIdStr: string) {
    const dishId = dishIdStr === "" ? null : dishIdStr;
    const base = orderMap.get(memberId)?.dishId ?? null;
    setOptimisticDish((prev) => ({ ...prev, [memberId]: { value: dishId, base } }));

    try {
      const sess = await getOrCreateSession(dateStr);
      await promise(upsertOrder(sess.id, memberId, dishId), {
        loading: "Đang lưu món...",
        success: dishId ? "Đã cập nhật món" : "Đã bỏ chọn món",
        error: "Lỗi khi cập nhật món!",
      });
      startTransition(() => router.refresh());
    } catch {
      clearOptimisticDish(memberId); // revert on failure
    }
  }

  async function handleTogglePaid(memberId: string, currentPaid: boolean) {
    const base = paid[memberId] ?? false;
    setOptimisticPaid((prev) => ({
      ...prev,
      [memberId]: { value: !currentPaid, base },
    }));

    try {
      await promise(setMemberPaid(memberId, dateStr, !currentPaid), {
        loading: "Đang lưu...",
        success: !currentPaid ? "Đã đánh dấu đã thanh toán" : "Đã bỏ thanh toán",
        error: "Lỗi khi cập nhật thanh toán!",
      });
      startTransition(() => router.refresh());
    } catch {
      clearOptimisticPaid(memberId); // revert on failure
    }
  }

  async function handleUpdateBill() {
    const value = billInput.trim() === "" ? null : parseFloat(billInput);
    if (value !== null && isNaN(value)) return;
    if (value === (session?.totalBill ?? null)) return; // no change
    try {
      await promise(updateTotalBill(dateStr, value), {
        loading: "Đang lưu...",
        success: "Đã cập nhật tổng bill",
        error: "Lỗi khi cập nhật tổng bill!",
      });
      startTransition(() => router.refresh());
    } catch {
      // Error toast already shown.
    }
  }

  async function handleUpdateUnitPrice(orderId: string) {
    const value = parseFloat(editPriceValue);
    if (isNaN(value) || value < 0) return;
    setEditingPriceId(null);
    try {
      await promise(updateOrderUnitPrice(orderId, value), {
        loading: "Đang lưu...",
        success: "Đã cập nhật đơn giá",
        error: "Lỗi khi cập nhật đơn giá!",
      });
      startTransition(() => router.refresh());
    } catch {
      // Error toast already shown.
    }
  }

  async function handleUpdateDebt(memberId: string) {
    const trimmed = editDebtValue.trim();
    const value = trimmed === "" ? null : parseFloat(trimmed);
    if (value !== null && (isNaN(value) || value < 0)) return;
    setEditingDebtId(null);
    try {
      await promise(updateMemberDebt(memberId, value, dateStr), {
        loading: "Đang lưu...",
        success: "Đã cập nhật nợ",
        error: "Lỗi khi cập nhật nợ!",
      });
      startTransition(() => router.refresh());
    } catch {
      // Error toast already shown.
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount * 1000);
  }

  // Shift the current date by whole days (UTC to match how sessions are keyed).
  function shiftDate(days: number): string {
    const d = new Date(dateStr + "T00:00:00.000Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0];
  }

  function goToDate(next: string) {
    router.push(`/?date=${next}`);
  }

  return (
    <div>
      {/* Date selector + Total bill input */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Ngày:</label>
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => goToDate(shiftDate(-1))}
                aria-label="Ngày trước"
                title="Ngày trước"
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                ‹
              </button>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => goToDate(e.target.value)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
              />
              <button
                type="button"
                onClick={() => goToDate(shiftDate(1))}
                aria-label="Ngày sau"
                title="Ngày sau"
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => goToDate(new Date().toISOString().split("T")[0])}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Hôm nay
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-800">{dateStr}</span>
          )}
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Tổng bill:
            </label>
            <div className="relative w-40">
              <input
                type="number"
                value={billInput}
                onChange={(e) => setBillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateBill()}
                placeholder="Nhập tổng bill..."
                className="w-full rounded border border-gray-300 py-1.5 pl-3 pr-9 text-right text-sm text-gray-800"
                min="0"
                step="1"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                000
              </span>
            </div>
            <button
              type="button"
              onClick={handleUpdateBill}
              disabled={
                (billInput.trim() === ""
                  ? null
                  : parseFloat(billInput)) === (session?.totalBill ?? null)
              }
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Tính
            </button>
            {perPerson && (
              <span className="text-sm text-gray-500">
                ÷ {orderCount} = {formatCurrency(perPerson)}/người
              </span>
            )}
          </div>
        ) : (
          session?.totalBill != null && perPerson && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Tổng bill: {formatCurrency(session.totalBill)}
              </span>
              <span className="text-sm text-gray-500">
                ÷ {orderCount} = {formatCurrency(perPerson)}/người
              </span>
            </div>
          )
        )}
      </div>

      {/* Order table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-3 py-2.5 text-left font-medium">STT</th>
              <th className="px-3 py-2.5 text-left font-medium">Tên</th>
              <th className="px-3 py-2.5 text-left font-medium">Món</th>
              <th className="px-3 py-2.5 text-right font-medium">Đơn giá</th>
              <th className="px-3 py-2.5 text-right font-medium">
                Thành tiền
              </th>
              <th className="px-3 py-2.5 text-center font-medium">
                Đã thanh toán
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                Tổng nợ cũ
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => {
              const order = orderMap.get(member.id);
              const debt = debts[member.id] || 0;

              const displayDishId = effectiveDish(member.id);
              const hasOrder = displayDishId !== null;

              const paidValue = effectivePaid(member.id);

              // Settled today: still show the amount, but struck through.
              // From the next day the debt reads as 0 (see getDebt).
              const debtSettled = paidValue && debt > 0;

              return (
                <tr
                  key={member.id}
                  className="border-t border-gray-100"
                  style={{ backgroundColor: hasOrder ? ROW_COLORS[idx % ROW_COLORS.length] : "#ffffff" }}
                >
                  <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {member.name}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={displayDishId ?? ""}
                      onChange={(e) =>
                        handleDishChange(member.id, e.target.value)
                      }
                      className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800"
                    >
                      <option value="">-- Chọn món --</option>
                      {dishes.map((dish) => (
                        <option key={dish.id} value={dish.id}>
                          {dish.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {hasOrder && order ? (
                      isAdmin && editingPriceId === order.id ? (
                        <span className="relative inline-block w-24">
                          <input
                            type="number"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            onBlur={() => handleUpdateUnitPrice(order.id)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleUpdateUnitPrice(order.id)
                            }
                            className="w-full rounded border border-gray-300 py-0.5 pl-1 pr-8 text-right text-sm text-gray-800"
                            autoFocus
                            min="0"
                            step="1"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                            000
                          </span>
                        </span>
                      ) : (
                        <span
                          className={isAdmin ? "cursor-pointer hover:text-blue-600" : ""}
                          onClick={() => {
                            if (isAdmin) {
                              setEditingPriceId(order.id);
                              setEditPriceValue(order.unitPrice.toString());
                            }
                          }}
                        >
                          {formatCurrency(order.unitPrice)}
                        </span>
                      )
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {hasOrder && perPerson ? formatCurrency(perPerson) : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={paidValue}
                      onChange={() => handleTogglePaid(member.id, paidValue)}
                      className="h-4 w-4 cursor-pointer accent-green-600"
                    />
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      debtSettled
                        ? "text-gray-400 line-through decoration-red-400"
                        : debt > 0
                          ? "font-medium text-red-600"
                          : "text-gray-400"
                    }`}
                    title={debtSettled ? "Đã thanh toán" : undefined}
                  >
                    {isAdmin && editingDebtId === member.id ? (
                      <span className="relative inline-block w-28">
                        <input
                          type="number"
                          value={editDebtValue}
                          onChange={(e) => setEditDebtValue(e.target.value)}
                          onBlur={() => handleUpdateDebt(member.id)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateDebt(member.id)
                          }
                          placeholder="Tự tính"
                          className="w-full rounded border border-gray-300 py-0.5 pl-1 pr-8 text-right text-sm text-gray-800"
                          autoFocus
                          min="0"
                          step="1"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          000
                        </span>
                      </span>
                    ) : (
                      <span
                        className={isAdmin ? "cursor-pointer hover:text-blue-600" : ""}
                        onClick={() => {
                          if (isAdmin) {
                            setEditingDebtId(member.id);
                            setEditDebtValue(debt > 0 ? debt.toString() : "");
                          }
                        }}
                      >
                        {debt > 0 ? formatCurrency(debt) : "0"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
              <td colSpan={3} className="px-3 py-2 text-right text-gray-700">
                Tổng cộng:
              </td>
              <td className="px-3 py-2 text-right text-gray-800">
                {totalDonGia > 0 ? formatCurrency(totalDonGia) : ""}
              </td>
              <td className="px-3 py-2 text-right text-gray-800">
                {totalThanhTien > 0 ? formatCurrency(totalThanhTien) : ""}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">
                {`${paidCount}/${members.length}`}
              </td>
              <td
                className={`px-3 py-2 text-right ${
                  totalDebt > 0 ? "text-red-600" : "text-gray-800"
                }`}
              >
                {totalDebt > 0 ? formatCurrency(totalDebt) : ""}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Dish summary */}
      {sortedDishCounts.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-bold text-gray-700">
            Tổng hợp món
          </h3>
          <div className="flex flex-wrap gap-3">
            {sortedDishCounts.map((d, i) => (
              <span
                key={d.id}
                className="rounded-full px-4 py-2 text-base font-bold"
                style={{ backgroundColor: ROW_COLORS[i % ROW_COLORS.length], color: "#1f2937" }}
              >
                {d.name}: {d.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
