"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getOrCreateSession,
  upsertOrder,
  togglePaid,
  updateTotalBill,
  updateOrderUnitPrice,
  updateMemberDebt,
} from "@/lib/actions";
import { useAdmin } from "./AdminProvider";

const UNIT_PRICE = 35000;

type Member = { id: string; name: string };
type Dish = { id: string; name: string; price: number };
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
}: {
  dateStr: string;
  session: Session;
  members: Member[];
  dishes: Dish[];
  debts: Record<string, number>;
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [, startTransition] = useTransition();
  const [billInput, setBillInput] = useState(
    session?.totalBill?.toString() ?? ""
  );
  const [optimisticPaid, setOptimisticPaid] = useState<Record<string, boolean>>(
    {}
  );
  const [optimisticDish, setOptimisticDish] = useState<
    Record<string, string | null>
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

  const orderCount = orderMap.size;
  const perPerson =
    session?.totalBill && orderCount > 0
      ? Math.ceil(session.totalBill / orderCount / 1000) * 1000
      : null;

  const dishCounts: Record<string, number> = {};
  for (const order of orderMap.values()) {
    dishCounts[order.dish.name] = (dishCounts[order.dish.name] || 0) + 1;
  }

  const totalThanhTien = perPerson ? perPerson * orderCount : 0;

  function handleDishChange(memberId: string, dishIdStr: string) {
    const dishId = dishIdStr === "" ? null : dishIdStr;
    setOptimisticDish((prev) => ({ ...prev, [memberId]: dishId }));

    getOrCreateSession(dateStr).then((sess) => {
      upsertOrder(sess.id, memberId, dishId).then(() => {
        startTransition(() => {
          router.refresh();
          setOptimisticDish((prev) => {
            const next = { ...prev };
            delete next[memberId];
            return next;
          });
        });
      });
    });
  }

  function handleTogglePaid(orderId: string, currentPaid: boolean) {
    setOptimisticPaid((prev) => ({ ...prev, [orderId]: !currentPaid }));

    togglePaid(orderId).then(() => {
      startTransition(() => {
        router.refresh();
        setOptimisticPaid((prev) => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
      });
    });
  }

  function handleUpdateBill() {
    const value = billInput.trim() === "" ? null : parseFloat(billInput);
    if (value !== null && isNaN(value)) return;
    updateTotalBill(dateStr, value).then(() => {
      startTransition(() => router.refresh());
    });
  }

  function handleUpdateUnitPrice(orderId: string) {
    const value = parseFloat(editPriceValue);
    if (isNaN(value) || value < 0) return;
    setEditingPriceId(null);
    updateOrderUnitPrice(orderId, value).then(() => {
      startTransition(() => router.refresh());
    });
  }

  function handleUpdateDebt(memberId: string) {
    const trimmed = editDebtValue.trim();
    const value = trimmed === "" ? null : parseFloat(trimmed);
    if (value !== null && (isNaN(value) || value < 0)) return;
    setEditingDebtId(null);
    updateMemberDebt(memberId, value).then(() => {
      startTransition(() => router.refresh());
    });
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount);
  }

  return (
    <div>
      {/* Date selector + Total bill input */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Ngày:</label>
          {isAdmin ? (
            <input
              type="date"
              value={dateStr}
              onChange={(e) => router.push(`/?date=${e.target.value}`)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
            />
          ) : (
            <span className="text-sm text-gray-800">{dateStr}</span>
          )}
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Tổng bill:
            </label>
            <input
              type="number"
              value={billInput}
              onChange={(e) => setBillInput(e.target.value)}
              onBlur={handleUpdateBill}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateBill()}
              placeholder="Nhập tổng bill..."
              className="w-40 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
              min="0"
            />
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

              const displayDishId =
                member.id in optimisticDish
                  ? optimisticDish[member.id]
                  : (order?.dishId ?? null);
              const hasOrder = displayDishId !== null;

              const paidValue =
                order && order.id in optimisticPaid
                  ? optimisticPaid[order.id]
                  : (order?.paid ?? false);

              return (
                <tr
                  key={member.id}
                  className={`border-t border-gray-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
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
                        <input
                          type="number"
                          value={editPriceValue}
                          onChange={(e) => setEditPriceValue(e.target.value)}
                          onBlur={() => handleUpdateUnitPrice(order.id)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateUnitPrice(order.id)
                          }
                          className="w-24 rounded border border-gray-300 px-1 py-0.5 text-right text-sm text-gray-800"
                          autoFocus
                          min="0"
                        />
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
                    {order && hasOrder && (
                      <input
                        type="checkbox"
                        checked={paidValue}
                        onChange={() =>
                          handleTogglePaid(order.id, order.paid)
                        }
                        className="h-4 w-4 cursor-pointer accent-green-600"
                      />
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      debt > 0 ? "font-medium text-red-600" : "text-gray-400"
                    }`}
                  >
                    {isAdmin && editingDebtId === member.id ? (
                      <input
                        type="number"
                        value={editDebtValue}
                        onChange={(e) => setEditDebtValue(e.target.value)}
                        onBlur={() => handleUpdateDebt(member.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdateDebt(member.id)
                        }
                        placeholder="Để trống = tự tính"
                        className="w-28 rounded border border-gray-300 px-1 py-0.5 text-right text-sm text-gray-800"
                        autoFocus
                        min="0"
                      />
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
            <tr className="border-t-2 border-gray-300 bg-gray-100 font-medium">
              <td colSpan={3} className="px-3 py-2 text-right text-gray-700">
                Tổng cộng:
              </td>
              <td></td>
              <td className="px-3 py-2 text-right text-gray-800">
                {totalThanhTien > 0 ? formatCurrency(totalThanhTien) : ""}
              </td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Dish summary */}
      {Object.keys(dishCounts).length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Tổng hợp món
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(dishCounts).map(([name, count]) => (
              <span
                key={name}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
              >
                {name}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
