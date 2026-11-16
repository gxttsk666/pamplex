"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FileText,
  Hash,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  SmilePlus,
  Square,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PamplexChannel, PamplexMessage } from "./types";
import { ProfileCard } from "./ProfileCard";
import { AvatarImg } from "./AvatarImg";

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
    fileData?: File | null,
    replyTo?: PamplexMessage | null
  ) => Promise<void> | void;
  onEditMessage: (messageId: string, newContent: string) => Promise<void> | void;
  onDeleteMessage: (messageId: string) => Promise<void> | void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string, pin: boolean) => Promise<void> | void;
  onTyping: () => void;
  supabase?: {
    storage: {
      from: (bucket: string) => {
        upload: (path: string, file: File, opts: object) => Promise<{ error: Error | null }>;
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
      };
    };
    auth: { getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }> };
  };
}

interface AuthorProfile {
  id: string;
  name: string;
  username: string;
  initials: string;
  accentColor: string;
  role?: string;
}

const QUICK_EMOJIS = ["👍", "💚", "🚀", "🔥", "😂"];
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?)/gi;
const AUDIO_URL_REGEX = /(https?:\/\/[^\s]+\.(?:webm|ogg|mp3|wav|m4a)(?:\?[^\s]*)?)/gi;
const FILE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:pdf|zip|txt|docx|doc|xlsx|xls|csv|pptx)(?:\?[^\s]*)?)/gi;
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
const GENERIC_URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getFileExt(url: string): string {
  const match = url.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return match ? match[1].toUpperCase() : "FILE";
}

function getFileName(url: string): string {
  try {
    const decoded = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "ficheiro");
    return decoded.length > 40 ? decoded.slice(0, 37) + "..." : decoded;
  } catch {
    return "ficheiro";
  }
}

function renderTextWithMentions(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) =>
    part.startsWith("@") ? (
      <span key={index} className="rounded-[6px] bg-pamplex-turquesa/15 px-1.5 py-0.5 font-medium text-pamplex-aqua">
        {part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
}

function renderMessageBody(content: string, onImageLoad?: () => void) {
  let cleanContent = content;

  if (cleanContent.startsWith("[reply:")) {
    const endIdx = cleanContent.indexOf("]");
    if (endIdx !== -1) cleanContent = cleanContent.slice(endIdx + 1).trim();
  }

  const lines = cleanContent.split("\n").filter((line) => {
    const t = line.trim();
    return !(t.startsWith("> **@") || t.startsWith("> **") || (t.startsWith(">") && t.includes(":")));
  });
  cleanContent = lines.join("\n").trim();

  const imageMatches = [...cleanContent.matchAll(new RegExp(IMAGE_URL_REGEX.source, "gi"))].map(m => m[0]);
  const audioMatches = [...cleanContent.matchAll(new RegExp(AUDIO_URL_REGEX.source, "gi"))].map(m => m[0]);
  const fileMatches = [...cleanContent.matchAll(new RegExp(FILE_URL_REGEX.source, "gi"))].map(m => m[0]);

  // YouTube embeds
  const ytMatches: string[] = [];
  let ytClean = cleanContent;
  ytClean = ytClean.replace(new RegExp(YOUTUBE_REGEX.source, "g"), (match, id) => {
    ytMatches.push(id);
    return "";
  });

  // Texto limpo sem URLs de media
  const allMediaUrls = new Set([...imageMatches, ...audioMatches, ...fileMatches]);
  let textOnly = ytClean;
  allMediaUrls.forEach(u => { textOnly = textOnly.replace(u, ""); });

  // Links genéricos restantes no texto (para preview)
  const genericLinks: string[] = [];
  textOnly = textOnly.replace(new RegExp(GENERIC_URL_REGEX.source, "g"), (url) => {
    if (!allMediaUrls.has(url) && !ytMatches.some(id => url.includes(id))) {
      genericLinks.push(url);
    }
    return url; // mantém no texto
  });

  const displayText = textOnly.trim();

  return (
    <div className="flex flex-col gap-1.5">
      {displayText && (
        <p className="text-sm text-pamplex-text-primary leading-relaxed break-words whitespace-pre-wrap">
          {renderTextWithMentions(displayText)}
        </p>
      )}

      {/* Imagens */}
      {imageMatches.map((url, idx) => (
        <a key={`img-${idx}`} href={url} target="_blank" rel="noopener noreferrer"
          className="mt-0.5 block w-fit max-w-xs sm:max-w-sm overflow-hidden rounded-[10px] border border-pamplex-border bg-pamplex-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Anexo" onLoad={onImageLoad} className="max-h-72 w-auto object-contain" loading="lazy" />
        </a>
      ))}

      {/* Áudio */}
      {audioMatches.map((url, idx) => (
        <div key={`audio-${idx}`} className="mt-1 flex items-center gap-2 rounded-[10px] border border-pamplex-border bg-pamplex-surface px-3 py-2 max-w-xs">
          <Mic className="h-4 w-4 shrink-0 text-pamplex-turquesa" />
          <audio controls src={url} className="h-8 flex-1 min-w-0" style={{ maxWidth: "220px" }} />
        </div>
      ))}

      {/* Ficheiros genéricos */}
      {fileMatches.map((url, idx) => (
        <a key={`file-${idx}`} href={url} target="_blank" rel="noopener noreferrer" download
          className="mt-1 flex items-center gap-3 rounded-[10px] border border-pamplex-border bg-pamplex-surface px-3 py-2.5 max-w-xs hover:bg-pamplex-elevated transition-colors">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-turquesa/15 text-pamplex-turquesa">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-medium text-pamplex-text-primary">{getFileName(url)}</span>
            <span className="text-[10px] text-pamplex-text-muted">{getFileExt(url)}</span>
          </div>
          <Download className="h-3.5 w-3.5 shrink-0 text-pamplex-text-muted ml-auto" />
        </a>
      ))}

      {/* YouTube embeds */}
      {ytMatches.map((id, idx) => (
        <div key={`yt-${idx}`} className="mt-1 overflow-hidden rounded-[10px] border border-pamplex-border max-w-sm aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            loading="lazy"
          />
        </div>
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
  onPinMessage,
  onTyping,
  supabase,
}: ChatAreaProps) {
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PamplexMessage | null>(null);
  const [profileTarget, setProfileTarget] = useState<AuthorProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 350) scrollToBottomInstant();
  };

  useEffect(() => {
    if (!selectedFile) { setFilePreviewUrl(null); return; }
    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFilePreviewUrl(null);
  }, [selectedFile]);

  const handleFilePick = (file: File | undefined | null) => {
    if (!file) return;
    setSelectedFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); handleFilePick(file); break; }
      }
    }
  };

  // ── Gravação de áudio ─────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        const ext = mr.mimeType.includes("webm") ? "webm" : "ogg";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mr.mimeType });
        setIsSending(true);
        try {
          if (supabase) {
            const { data: sess } = await supabase.auth.getSession();
            const uid = sess.session?.user.id ?? "anon";
            const path = `${uid}/voice-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { contentType: mr.mimeType });
            if (!error) {
              const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
              await onSendMessage(data.publicUrl, null, replyingTo);
              setReplyingTo(null);
            }
          } else {
            await onSendMessage("", file, replyingTo);
            setReplyingTo(null);
          }
        } finally { setIsSending(false); }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch { /* permissão negada */ }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  // ── Envio de mensagem ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if ((!clean && !selectedFile) || isSending) return;
    setIsSending(true);
    try {
      await onSendMessage(clean, selectedFile ?? null, replyingTo);
      setDraft("");
      setSelectedFile(null);
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally { setIsSending(false); }
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
    typingUsers.length === 1 ? `${typingUsers[0]} está digitando...`
    : typingUsers.length === 2 ? `${typingUsers[0]} e ${typingUsers[1]} estão digitando...`
    : typingUsers.length > 2 ? "Várias pessoas estão digitando..."
    : null;

  const pinnedMessages = messages.filter(m => m.isPinned);

  const displayedMessages = searchQuery.trim()
    ? messages.filter(m =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.authorName.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const openProfile = (msg: PamplexMessage) =>
    setProfileTarget({ id: msg.authorId, name: msg.authorName, username: msg.authorName.toLowerCase().replace(/\s+/g, ""), initials: msg.authorInitials, accentColor: msg.authorColor, role: msg.authorRole });

  return (
    <section aria-label={`Canal ${channel.name}`} className="flex h-full flex-1 flex-col bg-pamplex-bg min-w-0">
      {/* Cabeçalho */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-pamplex-border px-5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Hash className="h-5 w-5 shrink-0 text-pamplex-turquesa" />
          <h1 className="truncate text-base font-semibold text-pamplex-text-primary tracking-tight">{channel.name}</h1>
          <span className="hidden sm:inline text-xs text-pamplex-text-muted border-l border-pamplex-border pl-2.5 truncate">{channel.category}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pesquisa */}
          {showSearch ? (
            <div className="flex items-center gap-1.5 rounded-[8px] border border-pamplex-border bg-pamplex-dark px-2 py-1 text-xs focus-within:border-pamplex-turquesa transition-colors">
              <Search className="h-3.5 w-3.5 text-pamplex-text-muted shrink-0" />
              <input autoFocus type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar mensagens..." className="w-32 bg-transparent text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none" />
              <button type="button" onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-pamplex-text-muted hover:text-pamplex-text-primary cursor-pointer"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowSearch(true)} title="Pesquisar mensagens"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary transition-colors cursor-pointer">
              <Search className="h-4 w-4" />
            </button>
          )}
          {/* Mensagens fixadas */}
          <button type="button" onClick={() => setShowPinned(p => !p)} title="Mensagens fixadas"
            className={["flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors cursor-pointer",
              showPinned ? "bg-pamplex-elevated text-pamplex-turquesa" : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary"].join(" ")}>
            <Pin className="h-4 w-4" />
            {pinnedMessages.length > 0 && (
              <span className="ml-0.5 text-[10px] font-bold">{pinnedMessages.length}</span>
            )}
          </button>
          {/* Membros */}
          <button type="button" onClick={onToggleMembers} title={showMembers ? "Ocultar membros" : "Mostrar membros"}
            className={["flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
              showMembers ? "bg-pamplex-elevated text-pamplex-turquesa" : "text-pamplex-text-secondary hover:bg-pamplex-surface hover:text-pamplex-text-primary"].join(" ")}>
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Membros</span>
          </button>
        </div>
      </header>

      {/* Painel de mensagens fixadas */}
      {showPinned && (
        <div className="shrink-0 border-b border-pamplex-border bg-pamplex-surface px-5 py-3 max-h-48 overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted mb-2">
            Mensagens fixadas ({pinnedMessages.length})
          </p>
          {pinnedMessages.length === 0
            ? <p className="text-xs text-pamplex-text-muted">Nenhuma mensagem fixada.</p>
            : pinnedMessages.map(m => (
              <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-pamplex-border/50 last:border-0">
                <Pin className="h-3 w-3 shrink-0 text-pamplex-turquesa mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-pamplex-text-primary">{m.authorName}: </span>
                  <span className="text-xs text-pamplex-text-secondary truncate">{m.content.slice(0, 100)}</span>
                </div>
                {onPinMessage && (
                  <button type="button" onClick={() => onPinMessage(m.id, false)} title="Desafixar"
                    className="shrink-0 text-pamplex-text-muted hover:text-pamplex-danger cursor-pointer">
                    <PinOff className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Resultado de pesquisa */}
      {searchQuery.trim() && (
        <div className="shrink-0 px-5 py-1.5 border-b border-pamplex-border bg-pamplex-surface/60 text-xs text-pamplex-text-muted">
          {displayedMessages.length} resultado(s) para &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Fluxo de Mensagens */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-4 pb-6 flex flex-col gap-1">
        {!searchQuery.trim() && (
          <div className="mb-4 border-b border-pamplex-border pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-pamplex-surface border border-pamplex-border text-pamplex-turquesa mb-3">
              <Hash className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-pamplex-text-primary">Bem-vindo a #{channel.name}</h2>
            <p className="text-sm text-pamplex-text-secondary">Este é o início do histórico deste canal no Pamplex.</p>
          </div>
        )}

        {displayedMessages.map((msg, index) => {
          const prev = index > 0 ? displayedMessages[index - 1] : null;
          const isGrouped = !searchQuery.trim() && prev && prev.authorId === msg.authorId &&
            msg.timestamp - prev.timestamp <= FIVE_MINUTES_MS && !msg.replyTo;
          const isOwnMessage = msg.authorId === currentUserId;
          const isEditing = editingId === msg.id;
          const mentionsMe = currentUserUsername && msg.content.toLowerCase().includes(`@${currentUserUsername.toLowerCase()}`);

          return (
            <div key={msg.id} className={[
              "group relative flex items-start gap-3.5 rounded-[8px] px-2 py-1 transition-colors hover:bg-pamplex-surface/70",
              isGrouped ? "mt-0" : "mt-3 pt-1.5",
              mentionsMe ? "border-l-2 border-pamplex-turquesa bg-pamplex-turquesa/5" : "",
              msg.isPinned ? "border-l-2 border-amber-400/60 bg-amber-400/5" : "",
            ].join(" ")}>
              {isGrouped ? (
                <span suppressHydrationWarning className="w-9 shrink-0 text-right text-[10px] text-pamplex-text-muted opacity-0 group-hover:opacity-100 select-none pt-1">
                  {formatTime(msg.timestamp)}
                </span>
              ) : (
                <div onClick={() => openProfile(msg)} className="mt-0.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarImg
                    avatarUrl={msg.authorAvatarUrl}
                    initials={msg.authorInitials}
                    accentColor={msg.authorColor}
                    size="md"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!isGrouped && (
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span onClick={() => openProfile(msg)} className="text-sm font-semibold text-pamplex-text-primary cursor-pointer hover:underline">
                      {msg.authorName}
                    </span>
                    {msg.authorRole && (
                      <Badge variant={msg.authorRole === "Fundador" ? "turquesa" : "floresta"}>{msg.authorRole}</Badge>
                    )}
                    <span suppressHydrationWarning className="text-[11px] text-pamplex-text-muted">{formatTime(msg.timestamp)}</span>
                    {msg.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
                  </div>
                )}

                {msg.replyTo && (
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-pamplex-text-muted">
                    <div className="relative flex items-center">
                      <div className="absolute -top-2 left-0 h-3 w-3 rounded-tl-[6px] border-l-2 border-t-2 border-pamplex-border" />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-hidden rounded-[6px] bg-pamplex-surface/80 px-2 py-0.5 border border-pamplex-border/50">
                      <span className="font-semibold text-pamplex-turquesa shrink-0">@{msg.replyTo.authorName}</span>
                      <span className="truncate max-w-md text-pamplex-text-secondary opacity-90">
                        {msg.replyTo.content.replace(IMAGE_URL_REGEX, "[Imagem]")}
                      </span>
                    </div>
                  </div>
                )}

                {isEditing ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input type="text" value={editDraft} onChange={e => setEditDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveEdit(msg.id); } else if (e.key === "Escape") setEditingId(null); }}
                      autoFocus className="flex-1 rounded-[8px] border border-pamplex-turquesa bg-pamplex-dark px-2.5 py-1 text-sm text-pamplex-text-primary focus:outline-none" />
                    <button type="button" onClick={() => saveEdit(msg.id)} className="rounded-[6px] bg-pamplex-turquesa p-1.5 text-pamplex-dark hover:bg-pamplex-aqua cursor-pointer"><Check className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1.5 text-pamplex-text-secondary hover:text-pamplex-text-primary cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  renderMessageBody(msg.content, handleImageLoad)
                )}

                {msg.reactions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {msg.reactions.map(reaction => (
                      <button key={reaction.emoji} type="button" onClick={() => onToggleReaction(msg.id, reaction.emoji)}
                        className={["inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 text-xs transition-colors cursor-pointer",
                          reaction.reacted ? "border-pamplex-turquesa/50 bg-pamplex-turquesa/15 text-pamplex-aqua" : "border-pamplex-border bg-pamplex-surface text-pamplex-text-secondary hover:bg-pamplex-elevated"].join(" ")}>
                        <span>{reaction.emoji}</span>
                        <span className="font-medium">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações rápidas */}
              {!isEditing && (
                <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => setReplyingTo(msg)} title="Responder"
                    className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa cursor-pointer">
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setEmojiPickerFor(p => p === msg.id ? null : msg.id)} title="Reagir"
                    className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa cursor-pointer">
                    <SmilePlus className="h-3.5 w-3.5" />
                  </button>
                  {onPinMessage && (
                    <button type="button" onClick={() => onPinMessage(msg.id, !msg.isPinned)} title={msg.isPinned ? "Desafixar" : "Fixar"}
                      className={["rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 cursor-pointer",
                        msg.isPinned ? "text-amber-400 hover:text-amber-300" : "text-pamplex-text-secondary hover:text-amber-400"].join(" ")}>
                      {msg.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {isOwnMessage && (
                    <>
                      <button type="button" onClick={() => startEditing(msg)} title="Editar"
                        className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-pamplex-turquesa cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => onDeleteMessage(msg.id)} title="Apagar"
                        className="rounded-[6px] border border-pamplex-border bg-pamplex-surface p-1 text-pamplex-text-secondary hover:text-red-400 cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {emojiPickerFor === msg.id && (
                    <div className="absolute right-0 top-7 z-20 flex items-center gap-1 rounded-[8px] border border-pamplex-border bg-pamplex-surface p-1 shadow-lg">
                      {QUICK_EMOJIS.map(emoji => (
                        <button key={emoji} type="button" onClick={() => { onToggleReaction(msg.id, emoji); setEmojiPickerFor(null); }}
                          className="rounded-[6px] px-1.5 py-0.5 text-sm hover:bg-pamplex-elevated cursor-pointer">{emoji}</button>
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

      {/* Barra de Envio */}
      <form onSubmit={handleSubmit} className="shrink-0 px-5 pb-20 pt-1 bg-pamplex-bg">
        {replyingTo && (
          <div className="mb-2 flex items-center justify-between rounded-[8px] border border-pamplex-border bg-pamplex-surface px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 truncate text-pamplex-text-secondary">
              <Reply className="h-3.5 w-3.5 text-pamplex-turquesa shrink-0" />
              <span>A responder a <strong className="text-pamplex-text-primary">{replyingTo.authorName}</strong>:{" "}
                <span className="opacity-75">{replyingTo.content.replace(IMAGE_URL_REGEX, "[Imagem]")}</span>
              </span>
            </div>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-pamplex-text-muted hover:text-pamplex-text-primary cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {selectedFile && selectedFile.type.startsWith("image/") && filePreviewUrl && (
          <div className="mb-2 inline-flex items-start gap-2 rounded-[10px] border border-pamplex-border bg-pamplex-surface p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={filePreviewUrl} alt="Preview" className="h-20 w-auto rounded-[6px] object-cover" />
            <button type="button" onClick={() => setSelectedFile(null)} className="rounded-full bg-pamplex-dark p-1 text-pamplex-text-muted hover:text-red-400 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {selectedFile && !selectedFile.type.startsWith("image/") && (
          <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-pamplex-border bg-pamplex-surface px-3 py-2 text-xs">
            <FileText className="h-4 w-4 text-pamplex-turquesa shrink-0" />
            <span className="truncate text-pamplex-text-secondary flex-1">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="text-pamplex-text-muted hover:text-red-400 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Indicador de gravação */}
        {isRecording && (
          <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-pamplex-danger/40 bg-pamplex-danger/10 px-3 py-2 text-xs text-pamplex-danger">
            <span className="h-2 w-2 rounded-full bg-pamplex-danger animate-pulse" />
            Gravando... {recordingSeconds}s
            <button type="button" onClick={stopRecording} title="Parar gravação"
              className="ml-auto flex items-center gap-1 rounded-md bg-pamplex-danger/20 px-2 py-0.5 hover:bg-pamplex-danger/30 cursor-pointer">
              <Square className="h-3 w-3" /> Parar
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-[12px] border border-pamplex-border bg-pamplex-surface px-3 py-2 focus-within:border-pamplex-turquesa transition-colors">
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.zip,.txt,.docx,.doc,.xlsx,.csv,.pptx" onChange={e => handleFilePick(e.target.files?.[0])} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Anexar ficheiro"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-elevated text-pamplex-text-secondary hover:text-pamplex-turquesa transition-colors cursor-pointer">
            <Paperclip className="h-4 w-4" />
          </button>
          {/* Botão microfone */}
          <button type="button" onClick={isRecording ? stopRecording : startRecording} title={isRecording ? "Parar gravação" : "Gravar mensagem de voz"}
            className={["flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-elevated transition-colors cursor-pointer",
              isRecording ? "text-pamplex-danger" : "text-pamplex-text-secondary hover:text-pamplex-turquesa"].join(" ")}>
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <input type="text" value={draft} onChange={e => { setDraft(e.target.value); if (e.target.value.trim()) onTyping(); }}
            onPaste={handlePaste} placeholder={`Conversar em #${channel.name}...`}
            className="flex-1 bg-transparent text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:outline-none" />

          <button type="submit" disabled={(!draft.trim() && !selectedFile) || isSending || isRecording} title="Enviar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-pamplex-turquesa text-pamplex-dark transition-all hover:bg-pamplex-aqua disabled:opacity-35 disabled:pointer-events-none cursor-pointer">
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="mt-1 h-4 px-1">
          {typingLabel && <p className="text-[11px] font-medium text-pamplex-turquesa animate-pulse">{typingLabel}</p>}
        </div>
      </form>

      {profileTarget && (
        <ProfileCard name={profileTarget.name} username={profileTarget.username} initials={profileTarget.initials}
          accentColor={profileTarget.accentColor} status="online" role={profileTarget.role} onClose={() => setProfileTarget(null)} />
      )}
    </section>
  );
}
