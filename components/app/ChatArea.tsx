"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Hash,
  ImagePlus,
  Loader2,
  Pencil,
  Reply,
  Send,
  SmilePlus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PamplexChannel, PamplexMessage } from "./types";

interface ChatAreaProps {
  channel: PamplexChannel;
  messages: PamplexMessage[];
  currentUserId: string;
  currentUserUsername: string;
  typingUsers: string[];
  showMembers: boolean;
  onToggleMembers: () => void;
  onSendMessage: (
    content: string,
    imageFile?: File | null,
    replyTo?: PamplexMessage | null
  ) => Promise<void> | void;
  onEditMessage: (messageId: string, newContent: string) => Promise<void> | void;
  onDeleteMessage: (messageId: string) => Promise<void> | void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onTyping: () => void;
}

const QUICK_EMOJIS = ["👍", "💚", "🚀", "🔥", "😂"];
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?)/gi;

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTextWithMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
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

function renderMessageContent(content: string, onImageLoad?: () => void) {
  // Remove linhas de citação Markdown antigas caso venham legadas
  const cleanContent = content
    .split("\n")
    .filter((line) => !line.startsWith("> **@"))
    .join("\n")
    .trim();

  const imageMatches = cleanContent.match(IMAGE_URL_REGEX) ?? [];
  const textWithoutImages = cleanContent.replace(IMAGE_URL_REGEX, "").trim();

  return (
    <div className="flex flex-col gap-1.5">
      {textWithoutImages && (
        <p className="text-sm text-pamplex-text-primary leading-relaxed break-words whitespace-pre-wrap">
          {renderTextWithMentions(textWithoutImages)}
        </p>
      )}
      {imageMatches.map((url, idx) => (
        <a
          key={`${url}-${idx}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block w-fit max-w-xs sm:max-w-sm overflow-hidden rounded-[10px] border border-pamplex-border bg-pamplex-surface"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Anexo enviado no chat"
            onLoad={onImageLoad}
            className="max-h-72 w-auto object-contain"
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}

export function ChatArea({
  channel,
  messages,
  currentUserId,
  currentUserUsername,
  typingUsers,
  showMembers,
  onToggleMembers,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onTyping,
}: ChatAreaProps) {
  const [draft, setDraft] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PamplexMessage | null>(null);

  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialChannelScrollDoneRef = useRef<string | null>(null);

  const scrollToBottomInstant = () => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (initialChannelScrollDoneRef.current !== channel.id) {
      scrollToBottomInstant();
      initialChannelScrollDoneRef.current = channel.id;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, channel.id]);

  const handleImageLoad = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 350) scrollToBottomInstant();
  };

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const handleImagePick = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedImage(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleImagePick(file);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if ((!clean && !selectedImage) || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(clean, selectedImage, replyingTo);
      setDraft("");
      setSelectedImage(null);
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsSending(false);
    }
  };

  const startEditing = (msg: PamplexMessage) => {
    setEditingId(msg.id);
    setEditDraft(msg.content);
    setEmojiPickerFor(null);
  };

  const saveEdit = async (messageId: string) => {
    const clean = editDraft.trim();
    if (!clean) return;
    await onEditMessage(messageId, clean);
    setEditingId(null);
    setEditDraft("");
  };

  const typingLabel =
    typingUsers.length === 1
      ? `${typingUsers[0]} está digitando...`
      : typingUsers.length === 2
        ? `${typingUsers[0]} e ${typingUsers[1]} estão digitando...`
        : typingUsers.length > 2
          ? "Várias pessoas estão digitando..."
          : null;

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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 pb-6 flex flex-col gap-1"
      >
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
            msg.timestamp - prev.timestamp <= FIVE_MINUTES_MS &&
            !msg.replyTo;

          const isOwnMessage = msg.authorId === currentUserId;
          const isEditing = editingId === msg.id;

          const mentionsCurrentUser = currentUserUsername
            ? msg.content
                .toLowerCase()
                .includes(`@${currentUserUsername.toLowerCase()}`)
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

                {/* Bloco de Citação limpo se for uma Resposta */}
                {msg.replyTo && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-pamplex-text-muted">
                    <div className="h-3 w-2 rounded-bl border-b border-l border-pamplex-border" />
                    <span className="font-semibold text-pamplex-text-secondary">
                      @{msg.replyTo.authorName}
                    </span>
                    <span className="truncate max-w-md opacity-80">
                      {msg.replyTo.content.replace(IMAGE_URL_REGEX, "[Imagem]")}
                    </span>
                  </div>
                )}

                {isEditing ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit(msg.id);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 rounded-[8px] border border-pamplex-turquesa bg-pamplex-dark px-2.5 py-1 text-sm text-pamplex-text-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(msg.id)}
                      title="Guardar edição"
                      className="rounded-[6px] bg-pamplex-turquesa p-1.5 text-pamplex-dark hover:bg-pamplex-aqua cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      title="Cancelar"
                      className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1.5 text-pamplex-text-secondary hover:text-pamplex-text-primary cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  renderMessageContent(msg.content, handleImageLoad)
                )}

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

              {/* Ações rápidas ao passar o mouse */}
              {!isEditing && (
                <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setReplyingTo(msg)}
                    title="Responder"
                    className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa cursor-pointer"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEmojiPickerFor((prevId) =>
                        prevId === msg.id ? null : msg.id
                      )
                    }
                    title="Adicionar reação"
                    className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa cursor-pointer"
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>

                  {isOwnMessage && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditing(msg)}
                        title="Editar mensagem"
                        className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(msg.id)}
                        title="Apagar mensagem"
                        className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

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
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Caixa de Envio + Barra de Resposta */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 px-5 pb-20 pt-1 bg-pamplex-bg"
      >
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between rounded-[8px] border border-pamplex-border bg-pamplex-surface px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 truncate text-pamplex-text-secondary">
              <Reply className="h-3.5 w-3.5 text-pamplex-turquesa shrink-0" />
              <span>
                A responder a{" "}
                <strong className="text-pamplex-text-primary">
                  {replyingTo.authorName}
                </strong>
                :{" "}
                <span className="opacity-75">
                  {replyingTo.content.replace(IMAGE_URL_REGEX, "[Imagem]")}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-pamplex-text-muted hover:text-pamplex-text-primary cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {imagePreviewUrl && (
          <div className="mb-2 inline-flex items-start gap-2 rounded-[10px] border border-pamplex-border bg-pamplex-surface p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Preview do anexo"
              className="h-20 w-auto rounded-[6px] object-cover"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              title="Remover imagem"
              className="rounded-full bg-pamplex-dark p-1 text-pamplex-text-muted hover:text-red-400 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-[12px] border border-pamplex-border bg-pamplex-surface px-3 py-2 focus-within:border-pamplex-turquesa transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImagePick(e.target.files?.[0])}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar imagem (ou cole com Ctrl+V)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-elevated text-pamplex-text-secondary hover:text-pamplex-turquesa transition-colors cursor-pointer"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value.trim()) onTyping();
            }}
            onPaste={handlePaste}
            placeholder={`Conversar em #${channel.name}...`}
            className="flex-1 bg-transparent text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none"
          />

          <button
            type="submit"
            disabled={(!draft.trim() && !selectedImage) || isSending}
            title="Enviar mensagem"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-turquesa text-pamplex-dark transition-all hover:bg-pamplex-aqua disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="mt-1 h-4 px-1">
          {typingLabel && (
            <p className="text-[11px] font-medium text-pamplex-turquesa animate-pulse">
              {typingLabel}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}