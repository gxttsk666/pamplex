"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  MicOff,
  Plus,
  Settings,
  Volume2,
} from "lucide-react";
import { PamplexChannel, PamplexMember, PamplexServer } from "./types";

interface ChannelSidebarProps {
  server: PamplexServer;
  activeChannelId: string;
  connectedVoiceChannelId: string | null;
  members: PamplexMember[];
  onSelectTextChannel: (channelId: string) => void;
  onJoinVoiceChannel: (channelId: string) => void;
  onOpenInviteModal: () => void;
}

export function ChannelSidebar({
  server,
  activeChannelId,
  connectedVoiceChannelId,
  members,
  onSelectTextChannel,
  onJoinVoiceChannel,
  onOpenInviteModal,
}: ChannelSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const categories = Array.from(new Set(server.channels.map((c) => c.category)));

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const renderChannelItem = (channel: PamplexChannel) => {
    const isText = channel.type === "text";
    const isSelected = isText
      ? channel.id === activeChannelId
      : channel.id === connectedVoiceChannelId;

    const voiceMembers = !isText
      ? members.filter((m) => m.inVoiceChannelId === channel.id)
      : [];

    return (
      <div key={channel.id} className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() =>
            isText
              ? onSelectTextChannel(channel.id)
              : onJoinVoiceChannel(channel.id)
          }
          className={[
            "group flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-sm transition-colors duration-150 cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pamplex-turquesa",
            isSelected
              ? isText
                ? "bg-pamplex-elevated text-pamplex-text-primary font-medium"
                : "bg-pamplex-floresta-bg text-pamplex-menta font-medium border border-pamplex-esmeralda/30"
              : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary",
          ].join(" ")}
        >
          <span className="flex items-center gap-2 truncate">
            {isText ? (
              <Hash
                className={[
                  "h-4 w-4 shrink-0",
                  isSelected
                    ? "text-pamplex-turquesa"
                    : "text-pamplex-text-muted group-hover:text-pamplex-text-secondary",
                ].join(" ")}
              />
            ) : (
              <Volume2
                className={[
                  "h-4 w-4 shrink-0",
                  isSelected || voiceMembers.length > 0
                    ? "text-pamplex-esmeralda"
                    : "text-pamplex-text-muted group-hover:text-pamplex-text-secondary",
                ].join(" ")}
              />
            )}
            <span className="truncate">{channel.name}</span>
          </span>

          {channel.unread && !isSelected && (
            <span className="h-2 w-2 rounded-full bg-pamplex-turquesa shrink-0" />
          )}
        </button>

        {/* Membros dentro da sala de voz */}
        {!isText && voiceMembers.length > 0 && (
          <div className="ml-6 flex flex-col gap-1 py-1">
            {voiceMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-[6px] px-2 py-1 text-xs text-pamplex-text-secondary"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      member.accentColor,
                      member.isSpeaking
                        ? "ring-2 ring-pamplex-esmeralda"
                        : "",
                    ].join(" ")}
                  >
                    {member.initials}
                  </span>
                  <span className="truncate">{member.name}</span>
                </div>

                {member.isMuted && (
                  <MicOff className="h-3 w-3 text-pamplex-danger shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav
      aria-label="Canais do servidor"
      className="flex h-full w-[240px] shrink-0 flex-col bg-pamplex-sidebar border-r border-pamplex-border select-none"
    >
      {/* Cabeçalho do servidor */}
      <div className="flex h-13 items-center justify-between border-b border-pamplex-border px-4">
        <h2 className="truncate text-sm font-semibold text-pamplex-text-primary tracking-tight">
          {server.name}
        </h2>
        <button
          type="button"
          onClick={onOpenInviteModal}
          title="Convidar pessoas"
          className="rounded-[8px] p-1.5 text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-turquesa transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Lista de categorias e canais */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-4">
        {categories.map((category) => {
          const isCollapsed = Boolean(collapsedCategories[category]);
          const categoryChannels = server.channels.filter(
            (c) => c.category === category
          );

          return (
            <div key={category} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted hover:text-pamplex-text-secondary transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1 truncate">
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  )}
                  {category}
                </span>
              </button>

              {!isCollapsed && (
                <div className="flex flex-col gap-0.5">
                  {categoryChannels.map((channel) => renderChannelItem(channel))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé discreto da coluna de canais */}
      <div className="flex items-center justify-between border-t border-pamplex-border px-3.5 py-2.5 text-xs text-pamplex-text-muted">
        <span>Pamplex v0.1</span>
        <Settings className="h-3.5 w-3.5 text-pamplex-text-secondary" />
      </div>
    </nav>
  );
}