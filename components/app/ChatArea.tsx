"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Hash,
  Plus,
  Send,
  SmilePlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PamplexChannel, PamplexMessage } from "./types";

interface ChatAreaProps {
  channel: PamplexChannel;
  messages: PamplexMessage[];
  /** Username do utilizador atual, usado para destacar menções reais. */
  currentUserUsername: string;
  showMembers: boolean;
  onToggleMembers: () => void;
  onSendMessage: (content: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ["👍", "💚", "🚀", "🔥", "😂"];
const FIVE_MINUTES_MS = 5 * 60 * 1000;

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMessageContent(content: string) {
  const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={index}
          className="rounded-[6px] bg-pamplex-turquesa/15 px-1.5 py-0.5 font-medium text-pamplex-aqua"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function ChatArea({
  channel,
  messages,
  currentUserUsername,
  showMembers,
  onToggleMembers,
  onSendMessage,
  onToggleReaction,
}: ChatAreaProps) {
  const [draft, setDraft] = useState("");
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, channel.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    onSendMessage(clean);
    setDraft("");
  };

  return (
    <section
      aria-label={`Canal ${channel.name}`}
      className="flex h-full flex-1 flex-col bg-pamplex-bg min-w-0"
    >
      {/* Cabeçalho do Canal */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-pamplex-border px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Hash className="h-5 w-5 shrink-0 text-pamplex-turquesa" />
          <h1 className="truncate text-base font-semibold text-pamplex-text-primary tracking-tight">
            {channel.name}
          </h1>
          <span className="hidden sm:inline text-xs text-pamplex-text-muted border-l border-pamplex-border pl-2.5 truncate">
            {channel.category}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMembers}
          title={showMembers ? "Ocultar lista de membros" : "Mostrar lista de membros"}
          className={[
            "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
            showMembers
              ? "bg-pamplex-elevated text-pamplex-turquesa"
              : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary",
          ].join(" ")}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Membros</span>
        </button>
      </header>

      {/* Fluxo de Mensagens */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 flex flex-col gap-1">
        {/* Boas-vindas no topo do canal */}
        <div className="mb-4 border-b border-pamplex-border pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-pamplex-surface border border-pamplex-border text-pamplex-turquesa mb-3">
            <Hash className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-pamplex-text-primary">
            Bem-vindo a #{channel.name}
          </h2>
          <p className="text-sm text-pamplex-text-secondary">
            Este é o início do histórico deste canal no Pamplex.
          </p>
        </div>

        {messages.map((msg, index) => {
          const prev = index > 0 ? messages[index - 1] : null;
          const isGrouped =
            prev &&
            prev.authorId === msg.authorId &&
            msg.timestamp - prev.timestamp <= FIVE_MINUTES_MS;

          const mentionsCurrentUser = currentUserUsername
            ? msg.content.toLowerCase().includes(`@${currentUserUsername.toLowerCase()}`)
            : false;

          return (
            <div
              key={msg.id}
              className={[
                "group relative flex items-start gap-3.5 rounded-[8px] px-2 py-1 transition-colors hover:bg-pamplex-surface/70",
                isGrouped ? "mt-0" : "mt-3 pt-1.5",
                mentionsCurrentUser
                  ? "border-l-2 border-pamplex-turquesa bg-pamplex-turquesa/5"
                  : "",
              ].join(" ")}
            >
              {/* Avatar ou espaço alinhado */}
              {isGrouped ? (
                <span
                  suppressHydrationWarning
                  className="w-9 shrink-0 text-right text-[10px] text-pamplex-text-muted opacity-0 group-hover:opacity-100 select-none pt-1"
                >
                  {formatTime(msg.timestamp)}
                </span>
              ) : (
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold select-none mt-0.5",
                    msg.authorColor,
                  ].join(" ")}
                >
                  {msg.authorInitials}
                </div>
              )}

              {/* Conteúdo da mensagem */}
              <div className="flex-1 min-w-0">
                {!isGrouped && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-pamplex-text-primary">
                      {msg.authorName}
                    </span>
                    {msg.authorRole && (
                      <Badge
                        variant={
                          msg.authorRole === "Fundador" ? "turquesa" : "floresta"
                        }
                      >
                        {msg.authorRole}
                      </Badge>
                    )}
                    <span
                      suppressHydrationWarning
                      className="text-[11px] text-pamplex-text-muted"
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}

                <p className="text-sm text-pamplex-text-primary leading-relaxed break-words">
                  {renderMessageContent(msg.content)}
                </p>

                {/* Reações */}
                {msg.reactions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {msg.reactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        onClick={() => onToggleReaction(msg.id, reaction.emoji)}
                        className={[
                          "inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 text-xs transition-colors cursor-pointer",
                          reaction.reacted
                            ? "border-pamplex-turquesa/50 bg-pamplex-turquesa/15 text-pamplex-aqua"
                            : "border-pamplex-border bg-pamplex-surface text-pamplex-text-secondary hover:bg-pamplex-elevated",
                        ].join(" ")}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="font-medium">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Barra rápida de reação ao passar o mouse */}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    setEmojiPickerFor((prevId) =>
                      prevId === msg.id ? null : msg.id
                    )
                  }
                  title="Adicionar reação"
                  className="opacity-0 group-hover:opacity-100 rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa transition-all cursor-pointer"
                >
                  <SmilePlus className="h-3.5 w-3.5" />
                </button>

                {emojiPickerFor === msg.id && (
                  <div className="absolute right-0 top-7 z-20 flex items-center gap-1 rounded-[8px] border border-pamplex-border bg-pamplex-surface p-1 shadow-lg">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          onToggleReaction(msg.id, emoji);
                          setEmojiPickerFor(null);
                        }}
                        className="rounded-[6px] px-1.5 py-0.5 text-sm hover:bg-pamplex-elevated cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Caixa de Envio de Mensagem */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-5 pb-20 pt-2 bg-pamplex-bg"
      >
        <div className="flex items-center gap-2 rounded-[12px] border border-pamplex-border bg-pamplex-surface px-3 py-2 focus-within:border-pamplex-turquesa transition-colors">
          <button
            type="button"
            title="Anexar arquivo"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-elevated text-pamplex-text-secondary hover:text-pamplex-turquesa transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Conversar em #${channel.name}...`}
            className="flex-1 bg-transparent text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none"
          />

          <button
            type="submit"
            disabled={!draft.trim()}
            title="Enviar mensagem"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-turquesa text-pamplex-dark transition-all hover:bg-pamplex-aqua disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </section>
  );
}