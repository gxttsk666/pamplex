"use client";

import { useEffect, useRef } from "react";
import { AvatarImg } from "./AvatarImg";
import { X } from "lucide-react";

interface ProfileCardProps {
  name: string;
  username: string;
  initials: string;
  accentColor: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: "online" | "idle" | "dnd" | "offline";
  role?: string;
  onClose: () => void;
}

const STATUS_LABEL = {
  online: "Disponível",
  idle: "Ausente",
  dnd: "Não Perturbar",
  offline: "Offline",
};
const STATUS_COLOR = {
  online: "bg-pamplex-esmeralda",
  idle: "bg-amber-400",
  dnd: "bg-pamplex-danger",
  offline: "bg-pamplex-text-muted",
};

export function ProfileCard({
  name,
  username,
  initials,
  accentColor,
  avatarUrl,
  bio,
  status,
  role,
  onClose,
}: ProfileCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[79] bg-black/30" />
      <div
        ref={ref}
        className="fixed z-[80] w-72 rounded-2xl border border-pamplex-border bg-pamplex-surface shadow-2xl overflow-hidden"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      >
        {/* Banner */}
        <div className="h-16 bg-gradient-to-br from-pamplex-turquesa/30 to-pamplex-dark" />

        {/* Avatar flutuante */}
        <div className="-mt-8 px-4 flex items-end justify-between">
          <div className="ring-4 ring-pamplex-surface rounded-full">
            <AvatarImg
              avatarUrl={avatarUrl}
              initials={initials}
              accentColor={accentColor}
              size="lg"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mb-1 rounded-lg p-1 text-pamplex-text-secondary hover:bg-pamplex-elevated cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-pamplex-text-primary">{name}</span>
            {role && (
              <span className="rounded-full bg-pamplex-turquesa/15 px-2 py-0.5 text-[10px] font-semibold text-pamplex-turquesa">
                {role}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[status]}`} />
            <span className="text-xs text-pamplex-text-muted">
              {STATUS_LABEL[status]} · @{username}
            </span>
          </div>
          {bio && (
            <p className="mt-3 text-xs text-pamplex-text-secondary leading-relaxed border-t border-pamplex-border pt-3">
              {bio}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
