"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMember,
  addDish,
  updateMember,
  deleteMember,
  updateDish,
  deleteDish,
} from "@/lib/actions";
import { useAdmin } from "./AdminProvider";
import { useToast } from "./ToastProvider";

type Member = { id: string; name: string };
type Dish = { id: string; name: string; price: number };

export default function ManagePanel({
  members,
  dishes,
}: {
  members: Member[];
  dishes: Dish[];
}) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [, startTransition] = useTransition();
  const { showError } = useToast();
  const [showPanel, setShowPanel] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editDishName, setEditDishName] = useState("");
  const [editDishPrice, setEditDishPrice] = useState("");

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const name = memberName;
    setMemberName("");
    addMember(name).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi thêm thành viên!"));
  }

  function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    const name = dishName;
    const price = parseFloat(dishPrice);
    setDishName("");
    setDishPrice("");
    addDish(name, price).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi thêm món ăn!"));
  }

  function handleUpdateMember(id: string) {
    const name = editMemberName;
    setEditingMemberId(null);
    updateMember(id, name).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi cập nhật thành viên!"));
  }

  function handleDeleteMember(id: string) {
    deleteMember(id).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi xóa thành viên!"));
  }

  function handleUpdateDish(id: string) {
    const name = editDishName;
    const price = parseFloat(editDishPrice);
    setEditingDishId(null);
    updateDish(id, name, price).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi cập nhật món ăn!"));
  }

  function handleDeleteDish(id: string) {
    deleteDish(id).then(() => {
      startTransition(() => router.refresh());
    }).catch(() => showError("Lỗi khi xóa món ăn!"));
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
        <div className={`mt-3 grid gap-4 ${isAdmin ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"}`}>
          {/* Members section */}
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

                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm
              </button>
            </form>

            {isAdmin && members.length > 0 && (
              <div className="mt-3 space-y-1">
                <h4 className="text-xs font-medium text-gray-500 uppercase">
                  Danh sách ({members.length})
                </h4>
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"
                  >
                    {editingMemberId === m.id ? (
                      <>
                        <input
                          type="text"
                          value={editMemberName}
                          onChange={(e) => setEditMemberName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleUpdateMember(m.id)
                          }
                          className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-800"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateMember(m.id)}
                          className="text-xs text-green-600 hover:text-green-800"
          
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-800">
                          {m.name}
                        </span>
                        <button
                          onClick={() => {
                            setEditingMemberId(m.id);
                            setEditMemberName(m.name);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="text-xs text-red-600 hover:text-red-800"
          
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
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

                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Thêm
              </button>
            </form>

            {dishes.length > 0 && (
              <div className="mt-3 space-y-1">
                <h4 className="text-xs font-medium text-gray-500 uppercase">
                  Danh sách ({dishes.length})
                </h4>
                {dishes.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50"
                  >
                    {editingDishId === d.id ? (
                      <>
                        <input
                          type="text"
                          value={editDishName}
                          onChange={(e) => setEditDishName(e.target.value)}
                          className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-800"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={editDishPrice}
                          onChange={(e) => setEditDishPrice(e.target.value)}
                          className="w-24 rounded border border-gray-300 px-2 py-0.5 text-sm text-gray-800"
                          min="0"
                        />
                        <button
                          onClick={() => handleUpdateDish(d.id)}
                          className="text-xs text-green-600 hover:text-green-800"
          
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingDishId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-800">
                          {d.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Intl.NumberFormat("vi-VN").format(d.price)}đ
                        </span>
                        <button
                          onClick={() => {
                            setEditingDishId(d.id);
                            setEditDishName(d.name);
                            setEditDishPrice(d.price.toString());
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteDish(d.id)}
                          className="text-xs text-red-600 hover:text-red-800"
          
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
