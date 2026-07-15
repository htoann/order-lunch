"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearActivities } from "@/lib/actions";
import { useAdmin } from "./AdminProvider";
import { useConfirm } from "./ConfirmProvider";
import { useToast } from "./ToastProvider";

type Activity = {
  id: string;
  action: string;
  detail: string;
  ts: number;
};

const ACTION_ICON: Record<string, string> = {
  order: "🍽️",
  member: "👤",
  dish: "🍲",
  paid: "💰",
  debt: "🧾",
  bill: "💵",
  image: "🖼️",
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.round(hour / 24);
  if (day < 30) return `${day} ngày trước`;
  return new Date(ts).toLocaleDateString("vi-VN");
}

function fullTime(ts: number): string {
  return new Date(ts).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default function ActivityPanel({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const { confirm } = useConfirm();
  const { promise } = useToast();
  const [, startTransition] = useTransition();

  async function handleClear() {
    const ok = await confirm({
      title: "Xóa lịch sử",
      message: "Xóa toàn bộ lịch sử hoạt động?",
      confirmText: "Xóa",
      danger: true,
    });
    if (!ok) return;
    try {
      await promise(clearActivities(), {
        loading: "Đang xóa...",
        success: "Đã xóa lịch sử",
        error: "Lỗi khi xóa lịch sử!",
      });
      startTransition(() => router.refresh());
    } catch {
      // Error toast already shown.
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-700">Lịch sử hoạt động</h3>
        {isAdmin && activities.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-gray-400 hover:text-red-600"
          >
            Xóa
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có hoạt động nào.</p>
      ) : (
        <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {activities.map((a) => (
            <li key={a.id} className="flex gap-2 text-sm">
              <span className="shrink-0 leading-5" aria-hidden>
                {ACTION_ICON[a.action] ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-gray-800">{a.detail}</p>
                <p
                  className="text-xs text-gray-400"
                  title={fullTime(a.ts)}
                >
                  {relativeTime(a.ts)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
