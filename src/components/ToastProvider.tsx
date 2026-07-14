"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertIcon, CheckIcon, InfoIcon, XIcon } from "./icons";

type ToastType = "error" | "success" | "info";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextType = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  showError: () => {},
  showSuccess: () => {},
  showInfo: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const STYLES: Record<ToastType, { bar: string; icon: React.ReactNode }> = {
  error: {
    bar: "border-l-red-500",
    icon: <AlertIcon className="h-5 w-5 text-red-500" />,
  },
  success: {
    bar: "border-l-green-500",
    icon: <CheckIcon className="h-5 w-5 text-green-500" />,
  },
  info: {
    bar: "border-l-blue-500",
    icon: <InfoIcon className="h-5 w-5 text-blue-500" />,
  },
};

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const showError = useCallback((m: string) => push(m, "error"), [push]);
  const showSuccess = useCallback((m: string) => push(m, "success"), [push]);
  const showInfo = useCallback((m: string) => push(m, "info"), [push]);

  return (
    <ToastContext value={{ showError, showSuccess, showInfo }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] flex w-full max-w-xs flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-in flex items-center gap-3 rounded-lg border-l-4 bg-white px-4 py-3 shadow-lg ${STYLES[t.type].bar}`}
          >
            <span className="shrink-0">{STYLES[t.type].icon}</span>
            <span className="min-w-0 flex-1 text-sm font-medium text-gray-800">
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Đóng"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
