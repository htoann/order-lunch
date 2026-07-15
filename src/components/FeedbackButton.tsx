"use client";

import { useCallback, useEffect, useState } from "react";
import { addFeedback, getFeedbacks, deleteFeedback } from "@/lib/actions";
import { useAdmin } from "./AdminProvider";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";
import { ChatIcon, XIcon, TrashIcon } from "./icons";

type Feedback = {
  id: string;
  name: string | null;
  message: string;
  createdAt: string | Date;
};

export default function FeedbackButton() {
  const { isAdmin } = useAdmin();
  const { promise, showError } = useToast();
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadFeedbacks = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await getFeedbacks();
      setFeedbacks(list);
    } catch {
      // Ignore; admin can retry by reopening.
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Load the list only for admins when the modal opens.
  useEffect(() => {
    if (open && isAdmin) loadFeedbacks();
  }, [open, isAdmin, loadFeedbacks]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      showError("Vui lòng nhập nội dung góp ý!");
      return;
    }
    setSubmitting(true);
    try {
      await promise(addFeedback(trimmed, name), {
        loading: "Đang gửi...",
        success: "Cảm ơn bạn đã góp ý!",
        error: "Lỗi khi gửi góp ý!",
      });
      setMessage("");
      setName("");
      if (isAdmin) loadFeedbacks();
      else setOpen(false);
    } catch {
      // Error toast already shown.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Xóa góp ý",
      message: "Bạn có chắc muốn xóa góp ý này?",
    });
    if (!ok) return;
    try {
      await promise(deleteFeedback(id), {
        loading: "Đang xóa...",
        success: "Đã xóa góp ý",
        error: "Lỗi khi xóa góp ý!",
      });
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // Error toast already shown.
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
      >
        <ChatIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Góp ý</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col animate-pop rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <ChatIcon className="h-5 w-5 text-blue-600" />
                Góp ý về website
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên của bạn (không bắt buộc)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập góp ý hoặc nhận xét của bạn về website..."
                rows={4}
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang gửi..." : "Gửi góp ý"}
              </button>
            </div>

            {isAdmin && (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-gray-100 pt-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  Góp ý đã nhận ({feedbacks.length})
                </h3>
                {loadingList ? (
                  <p className="text-sm text-gray-400">Đang tải...</p>
                ) : feedbacks.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có góp ý nào.</p>
                ) : (
                  <ul className="space-y-2">
                    {feedbacks.map((f) => (
                      <li
                        key={f.id}
                        className="group rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-gray-800">
                            {f.message}
                          </p>
                          <button
                            onClick={() => handleDelete(f.id)}
                            title="Xóa góp ý"
                            className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {f.name ? `${f.name} · ` : ""}
                          {new Date(f.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
