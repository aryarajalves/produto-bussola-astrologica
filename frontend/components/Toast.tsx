"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export interface ToastMessage {
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toast?: ToastMessage | null;
  onClose?: () => void;
  duration?: number;
}

type ToastListener = (t: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string) => {
    listeners.forEach((fn) => fn({ type: "success", message }));
  },
  error: (message: string) => {
    listeners.forEach((fn) => fn({ type: "error", message }));
  },
  info: (message: string) => {
    listeners.forEach((fn) => fn({ type: "info", message }));
  },
};

export default function Toast({ toast: propToast, onClose: propOnClose, duration = 4000 }: ToastProps) {
  const [internalToast, setInternalToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const handler: ToastListener = (t) => {
      setInternalToast(t);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const activeToast = propToast !== undefined ? propToast : internalToast;

  const handleClose = () => {
    if (propOnClose) propOnClose();
    setInternalToast(null);
  };

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [activeToast, duration]);

  if (!activeToast) return null;

  const isSuccess = activeToast.type === "success";
  const isError = activeToast.type === "error";

  const toastContent = (
    <div
      data-testid="toast-notification"
      className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl transition-all max-w-sm sm:max-w-md animate-fadeIn"
      style={{
        background: isSuccess
          ? "rgba(16, 30, 24, 0.95)"
          : isError
          ? "rgba(35, 15, 20, 0.95)"
          : "rgba(26, 21, 53, 0.95)",
        border: `1px solid ${
          isSuccess
            ? "rgba(52, 211, 153, 0.4)"
            : isError
            ? "rgba(248, 113, 113, 0.4)"
            : "rgba(127, 119, 221, 0.4)"
        }`,
        boxShadow: isSuccess
          ? "0 10px 30px rgba(16, 185, 129, 0.25)"
          : isError
          ? "0 10px 30px rgba(239, 68, 68, 0.25)"
          : "0 10px 30px rgba(127, 119, 221, 0.25)",
        color: "#f0eeff",
      }}
    >
      <span className="text-xl shrink-0">
        {isSuccess ? "✅" : isError ? "⚠️" : "✨"}
      </span>
      <div className="flex-1 text-xs sm:text-sm font-medium">
        {activeToast.message}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="text-zinc-400 hover:text-white transition-colors p-1 text-sm font-bold cursor-pointer"
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(toastContent, document.body);
  }

  return toastContent;
}
