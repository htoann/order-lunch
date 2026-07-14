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
import { useConfirm } from "./ConfirmProvider";
import { PencilIcon, TrashIcon, CheckIcon, XIcon, PlusIcon } from "./icons";

type Member = { id: string; name: string };
type Dish = { id: string; name: string };

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
  const { promise } = useToast();
  const { confirm } = useConfirm();
  const [showPanel, setShowPanel] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [dishName, setDishName] = useState("");

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editDishName, setEditDishName] = useState("");

  async function save(p: Promise<unknown>, success: string, error: string) {
    try {
      await promise(p, { loading: "Đang lưu...", success, error });
      startTransition(() => router.refresh());
    } catch {
      // Error toast already shown.
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const name = memberName;
    setMemberName("");
    await save(addMember(name), "Đã thêm thành viên", "Lỗi khi thêm thành viên!");
  }

  async function handleAddDish(e: React.FormEvent) {
    e.preventDefault();
    const name = dishName;
    setDishName("");
    await save(addDish(name), "Đã thêm món ăn", "Lỗi khi thêm món ăn!");
  }

  async function handleUpdateMember(id: string) {
    const name = editMemberName;
    setEditingMemberId(null);
    await save(updateMember(id, name), "Đã cập nhật thành viên", "Lỗi khi cập nhật thành viên!");
  }

  async function handleDeleteMember(id: string, name: string) {
    const ok = await confirm({
      title: "Xóa thành viên",
      message: `Bạn có chắc muốn xóa "${name}"? Thành viên sẽ không còn hiển thị trong danh sách.`,
    });
    if (!ok) return;
    await save(deleteMember(id), "Đã xóa thành viên", "Lỗi khi xóa thành viên!");
  }

  async function handleUpdateDish(id: string) {
    const name = editDishName;
    setEditingDishId(null);
    await save(updateDish(id, name), "Đã cập nhật món ăn", "Lỗi khi cập nhật món ăn!");
  }

  async function handleDeleteDish(id: string, name: string) {
    const ok = await confirm({
      title: "Xóa món ăn",
      message: `Bạn có chắc muốn xóa món "${name}"?`,
    });
    if (!ok) return;
    await save(deleteDish(id), "Đã xóa món ăn", "Lỗi khi xóa món ăn!");
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        <span className="text-base">⚙️</span>
        {showPanel ? "Ẩn quản lý" : "Quản lý thành viên & món ăn"}
      </button>

      {showPanel && (
        <div className={`mt-4 grid gap-4 ${isAdmin ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md"}`}>
          {/* Members section */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
              Thành viên
            </h3>
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Tên thành viên"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                Thêm
              </button>
            </form>

            {isAdmin && members.length > 0 && (
              <div className="mt-4 space-y-0.5">
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Danh sách ({members.length})
                </h4>
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
                  >
                    {editingMemberId === m.id ? (
                      <>
                        <input
                          type="text"
                          value={editMemberName}
                          onChange={(e) => setEditMemberName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateMember(m.id);
                            if (e.key === "Escape") setEditingMemberId(null);
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateMember(m.id)}
                          title="Lưu"
                          className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingMemberId(null)}
                          title="Hủy"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm text-gray-800">
                          {m.name}
                        </span>
                        <button
                          onClick={() => {
                            setEditingMemberId(m.id);
                            setEditMemberName(m.name);
                          }}
                          title="Sửa"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          title="Xóa"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
              Món ăn
            </h3>
            <form onSubmit={handleAddDish} className="flex gap-2">
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="Tên món"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                Thêm
              </button>
            </form>

            {dishes.length > 0 && (
              <div className="mt-4 space-y-0.5">
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Danh sách ({dishes.length})
                </h4>
                {dishes.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50"
                  >
                    {editingDishId === d.id ? (
                      <>
                        <input
                          type="text"
                          value={editDishName}
                          onChange={(e) => setEditDishName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateDish(d.id);
                            if (e.key === "Escape") setEditingDishId(null);
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateDish(d.id)}
                          title="Lưu"
                          className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-50"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingDishId(null)}
                          title="Hủy"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm text-gray-800">
                          {d.name}
                        </span>
                        <button
                          onClick={() => {
                            setEditingDishId(d.id);
                            setEditDishName(d.name);
                          }}
                          title="Sửa"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(d.id, d.name)}
                          title="Xóa"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
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
