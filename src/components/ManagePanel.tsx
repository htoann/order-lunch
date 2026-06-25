"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember, addDish } from "@/lib/actions";

export default function ManagePanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPanel, setShowPanel] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    await addMember(memberName);
    setMemberName("");
    startTransition(() => router.refresh());
  }

  async function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    await addDish(dishName, parseFloat(dishPrice));
    setDishName("");
    setDishPrice("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        {showPanel ? "Ẩn quản lý" : "Quản lý thành viên & món ăn"}
      </button>

      {showPanel && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {/* Add member */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Thêm thành viên
            </h3>
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Tên thành viên"
                className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
                required
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm
              </button>
            </form>
          </div>

          {/* Add dish */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Thêm món ăn
            </h3>
            <form onSubmit={handleAddDish} className="flex gap-2">
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="Tên món"
                className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
                required
              />
              <input
                type="number"
                value={dishPrice}
                onChange={(e) => setDishPrice(e.target.value)}
                placeholder="Giá"
                className="w-28 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
                required
                min="0"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
