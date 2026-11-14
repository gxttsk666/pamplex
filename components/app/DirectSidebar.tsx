"use client";

import React, { useMemo, useState } from "react";
import { MessageSquare, Search, UserPlus, Users, X } from "lucide-react";
import { PamplexMember, UserStatus } from "./types";

interface DirectSidebarProps {
  friends: PamplexMember[];
  activeDmUserId: string | null;
  pendingCount: number;
  unreadByUserId: Record<string, number>;
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
  onSelectFriendsTab,
  onSelectDmUser,
}: DirectSidebarProps) {
  const [query, setQuery] = useState("");

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.relation === "friend"),
    [friends]
  );

  const filteredFriends = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return acceptedFriends;
    return acceptedFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(clean) ||
        f.username.toLowerCase().includes(clean)
    );
  }, [acceptedFriends, query]);

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

      {/* Navegação Principal (Amigos + Conversas) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 pb-24 flex flex-col gap-3">
        {/* Botão Amigos */}
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

        {/* Cabeçalho da Lista de Mensagens Diretas */}
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

        {/* Lista de Conversas 1-a-1 */}
        <div className="flex flex-col gap-0.5">
          {filteredFriends.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-pamplex-text-muted">
              Nenhuma conversa encontrada.
            </p>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = activeDmUserId === friend.id;
              const unread = unreadByUserId[friend.id] ?? 0;

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
                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                        friend.accentColor,
                      ].join(" ")}
                    >
                      {friend.initials}
                    </div>
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
                    <span className="truncate text-[11px] text-pamplex-text-muted">
                      {friend.customStatus ?? `@${friend.username}`}
                    </span>
                  </div>

                  {unread > 0 ? (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-pamplex-esmeralda px-1.5 text-[11px] font-bold text-pamplex-dark">
                      {unread}
                    </span>
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-pamplex-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Rodapé com Versão */}
      <div className="flex h-11 shrink-0 items-center justify-between border-t border-pamplex-border px-3 text-[11px] text-pamplex-text-muted">
        <span>Início • DMs</span>
        <span className="text-pamplex-turquesa font-medium">Pamplex</span>
      </div>
    </aside>
  );
}