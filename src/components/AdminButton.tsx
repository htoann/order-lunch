"use client";

import { useAdmin } from "./AdminProvider";

export default function AdminButton() {
  const { isAdmin, showLoginModal, logout } = useAdmin();

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          Admin
        </span>
        <button
          onClick={logout}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          Thoát Admin
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={showLoginModal}
      className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
    >
      Admin
    </button>
  );
}
