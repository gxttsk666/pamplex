"use client";

import React from "react";
import { MicOff, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PamplexMember, UserStatus } from "./types";

interface MemberListProps {
  members: PamplexMember[];
}

const statusDotColors: Record<UserStatus, string> = {
  online: "bg-pamplex-esmeralda",
  idle: "bg-pamplex-warning",
  dnd: "bg-pamplex-danger",
  offline: "bg-pamplex-text-muted",
};

export function MemberList({ members }: MemberListProps) {
  const inCallMembers = members.filter((m) => Boolean(m.inVoiceChannelId));
  const onlineMembers = members.filter(
    (m) => !m.inVoiceChannelId && m.status !== "offline"
  );
  const offlineMembers = members.filter((m) => m.status === "offline");

  const renderMemberRow = (member: PamplexMember, dimmed = false) => (
    <div
      key={member.id}
      className={[
        "flex items-center justify-between rounded-[8px] px-2 py-1.5 transition-colors hover:bg-pamplex-surface cursor-pointer",
        dimmed ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
              member.accentColor,
              member.isSpeaking ? "ring-2 ring-pamplex-esmeralda" : "",
            ].join(" ")}
          >
            {member.initials}
          </div>
          <span
            className={[
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-pamplex-sidebar",
              statusDotColors[member.status],
            ].join(" ")}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="truncate text-xs font-medium text-pamplex-text-primary">
            {member.name}
          </span>
          {member.role && (
            <span className="text-[10px] text-pamplex-text-muted truncate">
              {member.role}
            </span>
          )}
        </div>
      </div>

      {member.inVoiceChannelId && (
        <div className="flex items-center gap-1 shrink-0">
          {member.isMuted ? (
            <MicOff className="h-3.5 w-3.5 text-pamplex-danger" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-pamplex-esmeralda" />
          )}
        </div>
      )}
    </div>
  );

  return (
    <aside
      aria-label="Lista de membros"
      className="hidden lg:flex h-full w-[240px] shrink-0 flex-col bg-pamplex-sidebar border-l border-pamplex-border px-3 py-4 gap-5 overflow-y-auto pb-24 select-none"
    >
      {/* Prioridade: Em Call Agora */}
      {inCallMembers.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[12px] border border-pamplex-esmeralda/25 bg-pamplex-floresta-bg/50 p-2">
          <div className="flex items-center justify-between px-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-pamplex-menta">
              Em Call Agora
            </span>
            <Badge variant="esmeralda">{inCallMembers.length}</Badge>
          </div>
          <div className="flex flex-col gap-0.5">
            {inCallMembers.map((m) => renderMemberRow(m))}
          </div>
        </div>
      )}

      {/* Disponíveis */}
      {onlineMembers.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted">
            Disponíveis — {onlineMembers.length}
          </span>
          {onlineMembers.map((m) => renderMemberRow(m))}
        </div>
      )}

      {/* Offline */}
      {offlineMembers.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted">
            Offline — {offlineMembers.length}
          </span>
          {offlineMembers.map((m) => renderMemberRow(m, true))}
        </div>
      )}
    </aside>
  );
}