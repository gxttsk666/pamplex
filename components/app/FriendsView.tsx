"use client";

import React, { useMemo, useState } from "react";
import {
  Check,
  MessageSquare,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PamplexMember, UserStatus } from "./types";
import { Button } from "@/components/ui/Button";

type FriendsTab = "online" | "all" | "pending" | "add";

interface FriendsViewProps {
  members: PamplexMember[];
  onStartDm: (userId: string) => void;
  onAcceptRequest: (userId: string) => void;
  onDeclineRequest: (userId: string) => void;
  onSendFriendRequest: (username: string) => { ok: boolean; message: string };
}

const STATUS_DOT: Record<UserStatus, string> = {
  online: "bg-pamplex-esmeralda",
  idle: "bg-amber-400",
  dnd: "bg-pamplex-danger",
  offline: "bg-pamplex-text-muted",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  online: "Disponível",
  idle: "Ausente",
  dnd: "Ocupado",
  offline: "Offline",
};

export function FriendsView({
  members,
  onStartDm,
  onAcceptRequest,
  onDeclineRequest,
  onSendFriendRequest,
}: FriendsViewProps) {
  const [activeTab, setActiveTab] = useState<FriendsTab>("online");
  const [search, setSearch] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  const friends = useMemo(
    () => members.filter((m) => m.relation === "friend"),
    [members]
  );

  const onlineFriends = useMemo(
    () => friends.filter((f) => f.status !== "offline"),
    [friends]
  );

  const pendingRequests = useMemo(
    () =>
      members.filter(
        (m) =>
          m.relation === "pending_incoming" || m.relation === "pending_outgoing"
      ),
    [members]
  );

  const displayedList = useMemo(() => {
    const base =
      activeTab === "online"
        ? onlineFriends
        : activeTab === "all"
          ? friends
          : activeTab === "pending"
            ? pendingRequests
            : [];

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [activeTab, onlineFriends, friends, pendingRequests, search]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addUsername.trim().replace(/^@/, "");
    if (!clean) return;
    const result = onSendFriendRequest(clean);
    setFeedback(result);
    if (result.ok) {
      setAddUsername("");
    }
  };

  return (
    <section
      aria-label="Gerenciar Amigos"
      className="flex h-full flex-1 flex-col bg-pamplex-bg min-w-0"
    >
      {/* Cabeçalho com Abas */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-pamplex-border px-5 gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 pr-3 border-r border-pamplex-border text-pamplex-text-primary font-semibold text-sm">
            <Users className="h-4 w-4 text-pamplex-turquesa" />
            <span>Amigos</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("online")}
            className={[
              "rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              activeTab === "online"
                ? "bg-pamplex-elevated text-pamplex-text-primary"
                : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary",
            ].join(" ")}
          >
            Online ({onlineFriends.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={[
              "rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              activeTab === "all"
                ? "bg-pamplex-elevated text-pamplex-text-primary"
                : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary",
            ].join(" ")}
          >
            Todos ({friends.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={[
              "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              activeTab === "pending"
                ? "bg-pamplex-elevated text-pamplex-text-primary"
                : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary",
            ].join(" ")}
          >
            <span>Pendentes</span>
            {pendingRequests.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pamplex-turquesa px-1 text-[10px] font-bold text-pamplex-dark">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("add");
              setFeedback(null);
            }}
            className={[
              "rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
              activeTab === "add"
                ? "bg-pamplex-turquesa/20 text-pamplex-aqua"
                : "bg-pamplex-turquesa text-pamplex-dark hover:bg-pamplex-aqua",
            ].join(" ")}
          >
            Adicionar Amigo
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
        {activeTab === "add" ? (
          <div className="max-w-lg">
            <h2 className="text-base font-bold text-pamplex-text-primary">
              Adicionar Amigo no Pamplex
            </h2>
            <p className="mt-1 text-xs text-pamplex-text-secondary">
              Você pode adicionar amigos usando o nome de usuário (@username) deles.
            </p>

            <form
              onSubmit={handleAddSubmit}
              className="mt-4 flex items-center gap-2 rounded-[12px] border border-pamplex-border bg-pamplex-surface p-2 focus-within:border-pamplex-turquesa transition-colors"
            >
              <span className="pl-2 text-sm font-semibold text-pamplex-text-muted">
                @
              </span>
              <input
                type="text"
                value={addUsername}
                onChange={(e) => {
                  setAddUsername(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="ex: pedrosilva"
                className="flex-1 bg-transparent text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none"
              />
              <Button type="submit" variant="primary" disabled={!addUsername.trim()}>
                <UserPlus className="h-4 w-4" />
                Enviar Pedido
              </Button>
            </form>

            {feedback && (
              <p
                className={[
                  "mt-3 text-xs font-medium",
                  feedback.ok ? "text-pamplex-esmeralda" : "text-pamplex-danger",
                ].join(" ")}
              >
                {feedback.message}
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-3xl">
            {/* Filtro de Busca */}
            <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-pamplex-border bg-pamplex-surface px-3 py-2 focus-within:border-pamplex-turquesa transition-colors">
              <Search className="h-4 w-4 text-pamplex-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar amigo por nome ou @username..."
                className="w-full bg-transparent text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none"
              />
            </div>

            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted">
              {activeTab === "online" && `Disponíveis — ${displayedList.length}`}
              {activeTab === "all" && `Todos os Amigos — ${displayedList.length}`}
              {activeTab === "pending" && `Pedidos Pendentes — ${displayedList.length}`}
            </div>

            {displayedList.length === 0 ? (
              <div className="rounded-[12px] border border-pamplex-border bg-pamplex-surface/50 px-4 py-10 text-center text-sm text-pamplex-text-muted">
                Nenhum amigo encontrado nesta aba.
              </div>
            ) : (
              <div className="divide-y divide-pamplex-border/60 rounded-[12px] border border-pamplex-border bg-pamplex-surface/40">
                {displayedList.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-pamplex-surface transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={[
                            "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold",
                            person.accentColor,
                          ].join(" ")}
                        >
                          {person.initials}
                        </div>
                        <span
                          className={[
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-pamplex-surface",
                            STATUS_DOT[person.status],
                          ].join(" ")}
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-pamplex-text-primary">
                            {person.name}
                          </span>
                          <span className="text-xs text-pamplex-text-muted">
                            @{person.username}
                          </span>
                        </div>
                        <span className="truncate text-xs text-pamplex-text-secondary">
                          {person.relation === "pending_incoming"
                            ? "Pedido de amizade recebido"
                            : person.relation === "pending_outgoing"
                              ? "Pedido de amizade enviado"
                              : person.customStatus ?? STATUS_LABEL[person.status]}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      {person.relation === "pending_incoming" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onAcceptRequest(person.id)}
                            title="Aceitar pedido"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-pamplex-elevated text-pamplex-esmeralda hover:bg-pamplex-esmeralda hover:text-pamplex-dark transition-colors cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeclineRequest(person.id)}
                            title="Recusar pedido"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-pamplex-elevated text-pamplex-text-secondary hover:bg-pamplex-danger hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : person.relation === "pending_outgoing" ? (
                        <button
                          type="button"
                          onClick={() => onDeclineRequest(person.id)}
                          title="Cancelar pedido"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-pamplex-elevated text-pamplex-text-secondary hover:bg-pamplex-danger hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartDm(person.id)}
                          title="Enviar mensagem privada"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-pamplex-elevated text-pamplex-text-secondary hover:bg-pamplex-turquesa hover:text-pamplex-dark transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}