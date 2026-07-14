"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  AlertIcon,
  CheckIcon,
  InfoIcon,
  SpinnerIcon,
  XIcon,
} from "./icons";

type ToastType = "error" | "success" | "info" | "loading";
type Toast = { id: number; message: string; type: ToastType };

type PromiseMessages = {
  loading?: string;
  success: string;
  error: string;
};

type ToastContextType = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  promise: <T>(p: Promise<T>, messages: PromiseMessages) => Promise<T>;
};

const ToastContext = createContext<ToastContextType>({
  showError: () => {},
  showSuccess: () => {},
  showInfo: () => {},
  promise: (p) => p,
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
  loading: {
    bar: "border-l-blue-500",
    icon: <SpinnerIcon className="h-5 w-5 text-blue-500" />,
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

  const update = useCallback(
    (id: number, message: string, type: ToastType) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, message, type } : t))
      );
      if (type !== "loading") setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  const push = useCallback(
    (message: string, type: ToastType) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (type !== "loading") setTimeout(() => dismiss(id), 3000);
      return id;
    },
    [dismiss]
  );

  const showError = useCallback((m: string) => push(m, "error"), [push]);
  const showSuccess = useCallback((m: string) => push(m, "success"), [push]);
  const showInfo = useCallback((m: string) => push(m, "info"), [push]);

  const promise = useCallback(
    <T,>(p: Promise<T>, messages: PromiseMessages): Promise<T> => {
      const id = push(messages.loading ?? "Đang lưu...", "loading");
      p.then(
        () => update(id, messages.success, "success"),
        () => update(id, messages.error, "error")
      );
      return p;
    },
    [push, update]
  );

  return (
    <ToastContext value={{ showError, showSuccess, showInfo, promise }}>
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
            {t.type !== "loading" && (
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Đóng"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
