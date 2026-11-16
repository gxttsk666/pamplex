"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  MicOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Volume2,
} from "lucide-react";
import { PamplexChannel, PamplexMember, PamplexServer } from "./types";

interface ChannelSidebarProps {
  server: PamplexServer;
  activeChannelId: string;
  connectedVoiceChannelId: string | null;
  members: PamplexMember[];
  isOwner?: boolean;
  onSelectTextChannel: (channelId: string) => void;
  onJoinVoiceChannel: (channelId: string) => void;
  onOpenInviteModal: () => void;
  onRenameChannel?: (channelId: string, newName: string) => Promise<void>;
  onDeleteChannel?: (channelId: string) => Promise<void>;
  onRenameServer?: (newName: string) => Promise<void>;
}

export function ChannelSidebar({
  server,
  activeChannelId,
  connectedVoiceChannelId,
  members,
  isOwner = false,
  onSelectTextChannel,
  onJoinVoiceChannel,
  onOpenInviteModal,
  onRenameChannel,
  onDeleteChannel,
  onRenameServer,
}: ChannelSidebarProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [editingServerName, setEditingServerName] = useState(false);
  const [serverNameDraft, setServerNameDraft] = useState("");

  const categories = Array.from(new Set(server.channels.map((c) => c.category)));

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const commitRenameChannel = async (channelId: string) => {
    const name = editingName.trim();
    if (name) await onRenameChannel?.(channelId, name);
    setEditingChannelId(null);
  };

  const renderChannelItem = (channel: PamplexChannel) => {
    const isText = channel.type === "text";
    const isSelected = isText
      ? channel.id === activeChannelId
      : channel.id === connectedVoiceChannelId;

    const voiceMembers = !isText
      ? members.filter((m) => m.inVoiceChannelId === channel.id)
      : [];

    const isEditing = editingChannelId === channel.id;

    return (
      <div key={channel.id} className="flex flex-col gap-0.5">
        <div
          className={[
            "group flex w-full items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-sm transition-colors duration-150",
            isSelected
              ? isText
                ? "bg-pamplex-elevated text-pamplex-text-primary font-medium"
                : "bg-pamplex-floresta-bg text-pamplex-menta font-medium border border-pamplex-esmeralda/30"
              : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary",
          ].join(" ")}
        >
          {/* Ícone + nome (ou input de edição) */}
          <button
            type="button"
            onClick={() => isText ? onSelectTextChannel(channel.id) : onJoinVoiceChannel(channel.id)}
            className="flex flex-1 items-center gap-2 truncate cursor-pointer focus-visible:outline-none"
          >
            {isText ? (
              <Hash className={["h-4 w-4 shrink-0", isSelected ? "text-pamplex-turquesa" : "text-pamplex-text-muted group-hover:text-pamplex-text-secondary"].join(" ")} />
            ) : (
              <Volume2 className={["h-4 w-4 shrink-0", isSelected || voiceMembers.length > 0 ? "text-pamplex-esmeralda" : "text-pamplex-text-muted group-hover:text-pamplex-text-secondary"].join(" ")} />
            )}
            {isEditing ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitRenameChannel(channel.id); }
                  if (e.key === "Escape") setEditingChannelId(null);
                }}
                onBlur={() => commitRenameChannel(channel.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 rounded-[6px] border border-pamplex-turquesa bg-pamplex-dark px-1.5 py-0.5 text-xs text-pamplex-text-primary focus:outline-none"
              />
            ) : (
              <span className="truncate">{channel.name}</span>
            )}
          </button>

          {/* Ponto de não-lido */}
          {channel.unread && !isSelected && !isOwner && (
            <span className="h-2 w-2 rounded-full bg-pamplex-turquesa shrink-0" />
          )}

          {/* Menu de owner */}
          {isOwner && !isEditing && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === channel.id ? null : channel.id); }}
                className="rounded-[6px] p-0.5 opacity-0 group-hover:opacity-100 hover:bg-pamplex-elevated text-pamplex-text-muted hover:text-pamplex-text-primary transition cursor-pointer"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpenFor === channel.id && (
                <div className="absolute right-0 top-6 z-30 min-w-[130px] rounded-[10px] border border-pamplex-border bg-pamplex-surface shadow-lg p-1">
                  <button
                    type="button"
                    onClick={() => { setEditingChannelId(channel.id); setEditingName(channel.name); setMenuOpenFor(null); }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-text-primary transition cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" /> Renomear
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDeleteChannel?.(channel.id); setMenuOpenFor(null); }}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-pamplex-danger hover:bg-pamplex-danger/10 transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Membros dentro da sala de voz */}
        {!isText && voiceMembers.length > 0 && (
          <div className="ml-6 flex flex-col gap-1 py-1">
            {voiceMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-[6px] px-2 py-1 text-xs text-pamplex-text-secondary">
                <div className="flex items-center gap-2 truncate">
                  <span className={["flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", member.accentColor, member.isSpeaking ? "ring-2 ring-pamplex-esmeralda" : ""].join(" ")}>
                    {member.initials}
                  </span>
                  <span className="truncate">{member.name}</span>
                </div>
                {member.isMuted && <MicOff className="h-3 w-3 text-pamplex-danger shrink-0" />}
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
      <div className="flex h-13 items-center justify-between border-b border-pamplex-border px-4 gap-2">
        {editingServerName ? (
          <input
            autoFocus
            value={serverNameDraft}
            onChange={(e) => setServerNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (serverNameDraft.trim()) onRenameServer?.(serverNameDraft.trim());
                setEditingServerName(false);
              }
              if (e.key === "Escape") setEditingServerName(false);
            }}
            onBlur={() => setEditingServerName(false)}
            className="flex-1 rounded-[8px] border border-pamplex-turquesa bg-pamplex-dark px-2 py-1 text-sm text-pamplex-text-primary focus:outline-none"
          />
        ) : (
          <h2 className="truncate text-sm font-semibold text-pamplex-text-primary tracking-tight flex-1">
            {server.name}
          </h2>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {isOwner && !editingServerName && (
            <button
              type="button"
              onClick={() => { setServerNameDraft(server.name); setEditingServerName(true); }}
              title="Editar nome do servidor"
              className="rounded-[8px] p-1.5 text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-turquesa transition-colors cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenInviteModal}
            title="Convidar pessoas"
            className="rounded-[8px] p-1.5 text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-turquesa transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
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