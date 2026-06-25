"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getOrCreateSession,
  upsertOrder,
  togglePaid,
} from "@/lib/actions";

type Member = { id: number; name: string };
type Dish = { id: number; name: string; price: number };
type Order = {
  id: number;
  memberId: number;
  dishId: number;
  unitPrice: number;
  paid: boolean;
  member: Member;
  dish: Dish;
};
type Session = { id: number; orders: Order[] } | null;

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
  debts: Record<number, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingCell, setLoadingCell] = useState<number | null>(null);

  const orderMap = new Map<number, Order>();
  if (session) {
    for (const order of session.orders) {
      orderMap.set(order.memberId, order);
    }
  }

  const dishCounts: Record<string, number> = {};
  let totalAmount = 0;
  for (const order of orderMap.values()) {
    dishCounts[order.dish.name] = (dishCounts[order.dish.name] || 0) + 1;
    totalAmount += order.unitPrice;
  }

  async function handleDishChange(memberId: number, dishIdStr: string) {
    setLoadingCell(memberId);
    const dishId = dishIdStr === "" ? null : parseInt(dishIdStr);
    const sess = await getOrCreateSession(dateStr);
    await upsertOrder(sess.id, memberId, dishId);
    setLoadingCell(null);
    startTransition(() => router.refresh());
  }

  async function handleTogglePaid(orderId: number) {
    setLoadingCell(orderId * -1);
    await togglePaid(orderId);
    setLoadingCell(null);
    startTransition(() => router.refresh());
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("vi-VN").format(amount);
  }

  return (
    <div>
      {/* Date selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Ngày:</label>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => router.push(`/?date=${e.target.value}`)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
        />
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
              const isLoading =
                loadingCell === member.id ||
                (order && loadingCell === order.id * -1);

              return (
                <tr
                  key={member.id}
                  className={`border-t border-gray-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } ${isLoading ? "opacity-50" : ""}`}
                >
                  <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {member.name}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={order?.dishId ?? ""}
                      onChange={(e) =>
                        handleDishChange(member.id, e.target.value)
                      }
                      className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800"
                      disabled={isPending}
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
                    {order ? formatCurrency(order.unitPrice) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {order ? formatCurrency(order.unitPrice) : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {order && (
                      <button
                        onClick={() => handleTogglePaid(order.id)}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded ${
                          order.paid
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-500"
                        }`}
                        disabled={isPending}
                      >
                        {order.paid ? "✓" : "✗"}
                      </button>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      debt > 0 ? "font-medium text-red-600" : "text-gray-400"
                    }`}
                  >
                    {debt > 0 ? formatCurrency(debt) : "0"}
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
                {formatCurrency(totalAmount)}
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
