"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Check, Mic, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AvatarImg } from "./AvatarImg";

type UserStatus = "online" | "idle" | "dnd";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

interface SettingsModalProps {
  open: boolean;
  currentName: string;
  currentUsername: string;
  currentStatus: UserStatus;
  currentAvatarUrl?: string | null;
  currentBio?: string | null;
  userId: string;
  onClose: () => void;
  onSaved: (name: string, status: UserStatus) => void;
  onAvatarChange?: (url: string) => void;
}

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: "online", label: "Disponível", color: "bg-pamplex-esmeralda" },
  { value: "idle", label: "Ausente", color: "bg-pamplex-warning" },
  { value: "dnd", label: "Não Perturbar", color: "bg-pamplex-danger" },
];

export function SettingsModal({
  open,
  currentName,
  currentUsername,
  currentStatus,
  currentAvatarUrl,
  currentBio,
  userId,
  onClose,
  onSaved,
  onAvatarChange,
}: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(currentName);
  const [status, setStatus] = useState<UserStatus>(currentStatus);
  const [bio, setBio] = useState(currentBio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Dispositivos de áudio
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("default");
  const [selectedOutput, setSelectedOutput] = useState<string>("default");
  const [devicesLoaded, setDevicesLoaded] = useState(false);

  const supabase = useRef(createClient()).current;

  useEffect(() => {
    if (open) {
      setDisplayName(currentName);
      setStatus(currentStatus);
      setBio(currentBio ?? "");
      setAvatarPreview(currentAvatarUrl ?? null);
      setSaved(false);
      setError(null);
      loadDevices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentName, currentStatus, currentBio, currentAvatarUrl]);

  const loadDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microfone ${d.deviceId.slice(0, 6)}` }));
      const outputs = devices
        .filter((d) => d.kind === "audiooutput")
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Saída ${d.deviceId.slice(0, 6)}` }));
      setMicDevices(mics);
      setOutputDevices(outputs);
      setDevicesLoaded(true);
    } catch {
      setDevicesLoaded(true);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return;
    setAvatarUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${userId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (!uploadErr) {
        const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        const url = data.publicUrl;
        await (supabase.from("profiles").update({ avatar_url: url } as Record<string, unknown>).eq("id", userId));
        onAvatarChange?.(url);
      }
    } catch { /* Ignora */ } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), status, bio: bio.trim() || null } as Record<string, unknown>)
        .eq("id", userId);
      if (err) throw new Error(err.message);

      // Aplica dispositivos de áudio via setSinkId (saída) e controle de microfone via LiveKit não está disponível
      // fora do contexto LiveKit, então guardamos no sessionStorage para ser lido pelo VoiceRoomModal
      try {
        sessionStorage.setItem("pamplex_audio_input", selectedMic);
        sessionStorage.setItem("pamplex_audio_output", selectedOutput);
      } catch { /* Sem storage */ }

      setSaved(true);
      onSaved(displayName.trim(), status);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-[460px] max-w-[94vw] rounded-2xl border border-pamplex-border bg-pamplex-surface shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="sticky top-0 flex items-center justify-between border-b border-pamplex-border px-5 py-4 bg-pamplex-surface z-10">
          <h2 className="text-sm font-semibold text-pamplex-text-primary">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-text-primary transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex flex-col gap-6 px-5 py-5">
          {/* Perfil */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted">Perfil</h3>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="relative cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                title="Alterar foto de perfil"
              >
                <AvatarImg
                  avatarUrl={avatarPreview}
                  initials={currentName.slice(0, 2).toUpperCase()}
                  accentColor="bg-pamplex-turquesa text-pamplex-dark"
                  size="lg"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition">
                  <span className="text-[9px] font-bold text-white">ALTERAR</span>
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
              />
              <span className="text-xs text-pamplex-text-muted">Clica na imagem para alterar</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-pamplex-text-secondary">Nome de Exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                className="rounded-[10px] border border-pamplex-border bg-pamplex-dark px-3 py-2 text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:border-pamplex-turquesa focus:outline-none transition"
              />
              <span className="text-[11px] text-pamplex-text-muted">@{currentUsername}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-pamplex-text-secondary">Bio / Status personalizado</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={120}
                rows={2}
                placeholder="A jogar... A trabalhar no Pamplex..."
                className="rounded-[10px] border border-pamplex-border bg-pamplex-dark px-3 py-2 text-sm text-pamplex-text-primary placeholder:text-pamplex-text-muted focus:border-pamplex-turquesa focus:outline-none transition resize-none"
              />
              <span className="text-[11px] text-pamplex-text-muted text-right">{bio.length}/120</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-pamplex-text-secondary">Status</label>
              <div className="flex flex-col gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={[
                      "flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-sm text-left transition cursor-pointer",
                      status === opt.value
                        ? "border-pamplex-turquesa/60 bg-pamplex-turquesa/10 text-pamplex-text-primary"
                        : "border-pamplex-border bg-pamplex-dark text-pamplex-text-secondary hover:bg-pamplex-elevated",
                    ].join(" ")}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${opt.color}`} />
                    {opt.label}
                    {status === opt.value && <Check className="ml-auto h-3.5 w-3.5 text-pamplex-turquesa" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-pamplex-border" />

          {/* Áudio */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-pamplex-text-muted">Áudio</h3>

            {!devicesLoaded ? (
              <p className="text-xs text-pamplex-text-muted flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> A carregar dispositivos...
              </p>
            ) : (
              <>
                {/* Microfone */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-pamplex-text-secondary">
                    <Mic className="h-3.5 w-3.5" /> Microfone de Entrada
                  </label>
                  {micDevices.length === 0 ? (
                    <p className="text-xs text-pamplex-text-muted">Nenhum microfone detectado.</p>
                  ) : (
                    <select
                      value={selectedMic}
                      onChange={(e) => setSelectedMic(e.target.value)}
                      className="rounded-[10px] border border-pamplex-border bg-pamplex-dark px-3 py-2 text-sm text-pamplex-text-primary focus:border-pamplex-turquesa focus:outline-none transition cursor-pointer"
                    >
                      {micDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Saída */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-pamplex-text-secondary">
                    <Volume2 className="h-3.5 w-3.5" /> Dispositivo de Saída
                  </label>
                  {outputDevices.length === 0 ? (
                    <p className="text-xs text-pamplex-text-muted">
                      Nenhum dispositivo de saída detectado{typeof document !== "undefined" && !("setSinkId" in HTMLAudioElement.prototype) ? " (não suportado neste browser)" : ""}.
                    </p>
                  ) : (
                    <select
                      value={selectedOutput}
                      onChange={(e) => setSelectedOutput(e.target.value)}
                      className="rounded-[10px] border border-pamplex-border bg-pamplex-dark px-3 py-2 text-sm text-pamplex-text-primary focus:border-pamplex-turquesa focus:outline-none transition cursor-pointer"
                    >
                      {outputDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}
          </div>

          {error && <p className="text-xs text-pamplex-danger">{error}</p>}
        </div>

        {/* Rodapé */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-pamplex-border px-5 py-3.5 bg-pamplex-surface">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-pamplex-border bg-pamplex-dark px-4 py-1.5 text-xs font-medium text-pamplex-text-secondary hover:bg-pamplex-elevated transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="flex items-center gap-1.5 rounded-[10px] bg-pamplex-turquesa px-4 py-1.5 text-xs font-semibold text-pamplex-dark hover:bg-pamplex-aqua disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
            {saved ? "Guardado!" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
