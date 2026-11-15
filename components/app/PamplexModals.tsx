"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, Hash, Plus, Sparkles, UserPlus, Volume2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/* -------------------------------------------------------------------------- */
/* Servidor: criar ou entrar por convite                                       */
/* -------------------------------------------------------------------------- */

export interface ServerModalProps {
  open: boolean;
  initialTab: "create" | "join";
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onJoin: (invite: string) => Promise<string | null>;
}

export function ServerModal({
  open,
  initialTab,
  onClose,
  onCreate,
  onJoin,
}: ServerModalProps) {
  const [tab, setTab] = useState<"create" | "join">(initialTab);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reinicia o formulário sempre que o modal é reaberto.
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setJoinError(null);
  }, [open, initialTab]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await onCreate(name);
      setName("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    setJoinError(null);
    setBusy(true);
    try {
      const error = await onJoin(invite);
      if (error) {
        setJoinError(error);
        return;
      }
      setInvite("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tab === "create" ? "Criar novo servidor" : "Entrar num servidor"}
      description={
        tab === "create"
          ? "Crie um espaço organizado para amigos, equipa ou comunidade."
          : "Cole o link de convite ou o ID do servidor partilhado com você."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {tab === "create" ? (
            <Button variant="primary" onClick={handleCreate} disabled={busy}>
              <Sparkles className="h-4 w-4" />
              Criar Servidor
            </Button>
          ) : (
            <Button variant="primary" onClick={handleJoin} disabled={busy}>
              <UserPlus className="h-4 w-4" />
              Entrar no Servidor
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-zinc-800 pb-3">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              tab === "create"
                ? "bg-teal-400 text-zinc-950 font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Criar Novo
          </button>
          <button
            type="button"
            onClick={() => setTab("join")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              tab === "join"
                ? "bg-teal-400 text-zinc-950 font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Tenho um Convite
          </button>
        </div>

        {tab === "create" ? (
          <Input
            label="Nome do servidor"
            placeholder="Ex: Oficina 3D & Projetos"
            leftIcon={<Hash className="h-4 w-4" />}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        ) : (
          <div className="space-y-2">
            <Input
              label="Link de convite ou ID"
              placeholder="https://pamplex-lilac.vercel.app/convite/..."
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
            {joinError && <p className="text-xs text-pamplex-danger">{joinError}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Canal                                                                       */
/* -------------------------------------------------------------------------- */

export interface ChannelModalProps {
  open: boolean;
  serverName: string;
  onClose: () => void;
  onCreate: (
    name: string,
    type: "text" | "voice"
  ) => Promise<{ ok: boolean; message?: string }>;
}

export function ChannelModal({
  open,
  serverName,
  onClose,
  onCreate,
}: ChannelModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "voice">("text");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Dê um nome ao canal.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await onCreate(name, type);
      if (!result.ok) {
        setError(result.message ?? "Não foi possível criar o canal.");
        return;
      }
      setName("");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Criar canal em ${serverName || "Servidor"}`}
      description="Escolha o tipo de canal e um nome para organizar as conversas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={busy}>
            <Plus className="h-4 w-4" />
            Criar Canal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("text")}
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition cursor-pointer ${
              type === "text"
                ? "border-teal-400 bg-teal-400/10 text-teal-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Hash className="h-4 w-4" />
            Canal de Texto
          </button>
          <button
            type="button"
            onClick={() => setType("voice")}
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition cursor-pointer ${
              type === "voice"
                ? "border-teal-400 bg-teal-400/10 text-teal-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Volume2 className="h-4 w-4" />
            Sala de Voz
          </button>
        </div>

        <Input
          label="Nome do canal"
          placeholder={type === "text" ? "ex: avisos-gerais" : "Ex: Squad Gaming"}
          leftIcon={
            type === "text" ? (
              <Hash className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )
          }
          value={name}
          error={error ?? undefined}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Convite                                                                     */
/* -------------------------------------------------------------------------- */

export interface InviteModalProps {
  open: boolean;
  serverName: string;
  inviteUrl: string;
  onClose: () => void;
}

export function InviteModal({
  open,
  serverName,
  inviteUrl,
  onClose,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Convidar para ${serverName}`}
      description="Partilhe este link direto para que outros utilizadores entrem no servidor."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Concluir
        </Button>
      }
    >
      <div className="flex items-end gap-2">
        <Input label="Link de convite" value={inviteUrl} readOnly />
        <Button variant="primary" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copiar
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
