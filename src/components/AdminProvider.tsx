"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { verifyAdminPassword } from "@/lib/actions";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-80 rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Đăng nhập Admin
            </h2>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Nhập mật khẩu..."
                className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              {error && (
                <p className="mb-3 text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
