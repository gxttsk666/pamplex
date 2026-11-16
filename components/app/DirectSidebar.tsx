"use client";

import React, { useMemo, useState } from "react";
import { MessageSquare, Pin, PinOff, Search, UserPlus, Users, X } from "lucide-react";
import { PamplexMember, UserStatus } from "./types";
import { AvatarImg } from "./AvatarImg";

export interface DmPreview {
  text: string;
  timestamp: number;
}

interface DirectSidebarProps {
  friends: PamplexMember[];
  activeDmUserId: string | null;
  pendingCount: number;
  unreadByUserId: Record<string, number>;
  lastDmByUserId: Record<string, DmPreview>;
  onSelectFriendsTab: () => void;
  onSelectDmUser: (userId: string) => void;
}

const STATUS_DOT: Record<UserStatus, string> = {
  online: "bg-pamplex-esmeralda",
  idle: "bg-amber-400",
  dnd: "bg-pamplex-danger",
  offline: "bg-pamplex-text-muted",
};

export function DirectSidebar({
  friends,
  activeDmUserId,
  pendingCount,
  unreadByUserId,
  lastDmByUserId,
  onSelectFriendsTab,
  onSelectDmUser,
}: DirectSidebarProps) {
  const [query, setQuery] = useState("");
  const [pinnedDmIds, setPinnedDmIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("pamplex_pinned_dms");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  const togglePinDm = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedDmIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      localStorage.setItem("pamplex_pinned_dms", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const sortedFriends = useMemo(() => {
    const accepted = friends.filter((f) => f.relation === "friend");
    const pinned = accepted.filter(f => pinnedDmIds.has(f.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const unpinned = accepted.filter(f => !pinnedDmIds.has(f.id)).sort((a, b) => {
      const tsA = lastDmByUserId[a.id]?.timestamp ?? 0;
      const tsB = lastDmByUserId[b.id]?.timestamp ?? 0;
      if (tsA !== tsB) return tsB - tsA;
      const onlineA = a.status !== "offline" ? 1 : 0;
      const onlineB = b.status !== "offline" ? 1 : 0;
      if (onlineA !== onlineB) return onlineB - onlineA;
      return a.name.localeCompare(b.name, "pt-BR");
    });
    return [...pinned, ...unpinned];
  }, [friends, lastDmByUserId, pinnedDmIds]);

  const filteredFriends = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return sortedFriends;
    return sortedFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(clean) ||
        f.username.toLowerCase().includes(clean)
    );
  }, [sortedFriends, query]);

  return (
    <aside
      aria-label="Mensagens Diretas"
      className="flex h-full w-60 shrink-0 flex-col border-r border-pamplex-border bg-pamplex-surface select-none"
    >
      {/* Topo com Busca Rápida */}
      <div className="flex h-13 shrink-0 items-center border-b border-pamplex-border px-3">
        <div className="flex w-full items-center gap-2 rounded-[8px] border border-pamplex-border bg-pamplex-dark px-2.5 py-1.5 text-xs focus-within:border-pamplex-turquesa transition-colors">
          <Search className="h-3.5 w-3.5 shrink-0 text-pamplex-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Encontrar conversa..."
            className="w-full bg-transparent text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-pamplex-text-muted hover:text-pamplex-text-primary cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Navegação Principal */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 pb-24 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSelectFriendsTab}
          className={[
            "flex items-center justify-between rounded-[10px] px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            activeDmUserId === null
              ? "bg-pamplex-elevated text-pamplex-text-primary"
              : "text-pamplex-text-secondary hover:bg-pamplex-elevated/60 hover:text-pamplex-text-primary",
          ].join(" ")}
        >
          <span className="flex items-center gap-2.5">
            <Users
              className={[
                "h-4 w-4",
                activeDmUserId === null
                  ? "text-pamplex-turquesa"
                  : "text-pamplex-text-muted",
              ].join(" ")}
            />
            Amigos
          </span>

          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pamplex-turquesa px-1.5 text-[11px] font-bold text-pamplex-dark">
              {pendingCount}
            </span>
          )}
        </button>

        <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted">
          <span>Mensagens Diretas</span>
          <button
            type="button"
            onClick={onSelectFriendsTab}
            title="Nova mensagem direta"
            className="hover:text-pamplex-turquesa transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {filteredFriends.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-pamplex-text-muted">
              Nenhuma conversa encontrada.
            </p>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = activeDmUserId === friend.id;
              const unread = unreadByUserId[friend.id] ?? 0;
              const lastDm = lastDmByUserId[friend.id];
              const subtitle = lastDm
                ? lastDm.text
                : friend.customStatus ?? `@${friend.username}`;

              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => onSelectDmUser(friend.id)}
                  className={[
                    "group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-pamplex-elevated text-pamplex-text-primary"
                      : "text-pamplex-text-secondary hover:bg-pamplex-elevated/60 hover:text-pamplex-text-primary",
                  ].join(" ")}
                >
                  <div className="relative shrink-0">
                    <AvatarImg
                      avatarUrl={friend.avatarUrl}
                      initials={friend.initials}
                      accentColor={friend.accentColor}
                      size="sm"
                    />
                    <span
                      className={[
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-pamplex-surface",
                        STATUS_DOT[friend.status],
                      ].join(" ")}
                    />
                  </div>

                  <div className="flex flex-1 flex-col min-w-0">
                    <span
                      className={[
                        "truncate text-sm",
                        unread > 0 || isSelected
                          ? "font-semibold text-pamplex-text-primary"
                          : "font-medium",
                      ].join(" ")}
                    >
                      {friend.name}
                    </span>
                    <span
                      className={[
                        "truncate text-[11px]",
                        unread > 0
                          ? "font-medium text-pamplex-text-secondary"
                          : "text-pamplex-text-muted",
                      ].join(" ")}
                    >
                      {subtitle}
                    </span>
                  </div>

                  {unread > 0 ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-pamplex-esmeralda px-1.5 text-[11px] font-bold text-pamplex-dark">
                      {unread}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => togglePinDm(friend.id, e)}
                        title={pinnedDmIds.has(friend.id) ? "Desafixar" : "Fixar"}
                        className="shrink-0 text-pamplex-text-muted hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {pinnedDmIds.has(friend.id) ? (
                          <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ) : (
                          <PinOff className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-pamplex-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex h-11 shrink-0 items-center justify-between border-t border-pamplex-border px-3 text-[11px] text-pamplex-text-muted">
        <span>Início • DMs</span>
        <span className="text-pamplex-turquesa font-medium">Pamplex</span>
      </div>
    </aside>
  );
}