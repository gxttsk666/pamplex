"use client";

import React, { useEffect, useRef, useState } from "react";

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
}

export function Menu({ trigger, items, align = "left" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex cursor-pointer"
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={[
            "absolute z-40 mt-2 min-w-[200px] rounded-[12px] border border-pamplex-border bg-pamplex-surface p-1.5 shadow-xl shadow-black/40",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect?.();
                setOpen(false);
              }}
              className={[
                "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm transition-colors duration-150 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pamplex-turquesa",
                "disabled:opacity-45 disabled:pointer-events-none",
                item.danger
                  ? "text-pamplex-danger hover:bg-pamplex-danger/15"
                  : "text-pamplex-text-primary hover:bg-pamplex-elevated hover:text-pamplex-aqua",
              ].join(" ")}
            >
              {item.icon && (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="truncate font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}