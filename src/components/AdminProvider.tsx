"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { verifyAdminPassword } from "@/lib/actions";
import { LockIcon } from "./icons";

type AdminContextType = {
  isAdmin: boolean;
  showLoginModal: () => void;
  logout: () => void;
};

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  showLoginModal: () => {},
  logout: () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

export default function AdminProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const showLoginModal = useCallback(() => {
    setModalOpen(true);
    setPassword("");
    setError("");
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await verifyAdminPassword(password);
    if (ok) {
      setIsAdmin(true);
      setModalOpen(false);
      setPassword("");
      setError("");
    } else {
      setError("Sai mật khẩu!");
    }
  }

  return (
    <AdminContext value={{ isAdmin, showLoginModal, logout }}>
      {children}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm animate-pop rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <LockIcon className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                Đăng nhập Admin
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Nhập mật khẩu..."
                className={`mb-2 w-full rounded-lg border px-3 py-2 text-sm text-gray-800 transition-colors focus:outline-none focus:ring-2 ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
                autoFocus
              />
              {error && (
                <p className="mb-2 text-sm text-red-600">{error}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminContext>
  );
}
