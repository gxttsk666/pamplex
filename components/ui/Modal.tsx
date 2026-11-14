"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pamplex-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Fundo escurecido */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-pamplex-dark/80 backdrop-blur-xs transition-opacity"
      />

      {/* Cartão do Modal */}
      <div className="relative z-10 w-full max-w-md rounded-[12px] border border-pamplex-border bg-pamplex-surface p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="pamplex-modal-title"
              className="text-lg font-semibold text-pamplex-text-primary tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-pamplex-text-secondary">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-[8px] p-1.5 text-pamplex-text-secondary transition-colors hover:bg-pamplex-elevated hover:text-pamplex-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pamplex-turquesa cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>

        {footer && (
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-pamplex-border pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}