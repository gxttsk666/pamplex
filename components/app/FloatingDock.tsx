"use client";

import {
  Headphones,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Settings,
  VolumeX,
} from "lucide-react";
import { playDigitalDisconnect } from "@/lib/sounds";

interface FloatingDockProps {
  currentUser: {
    name: string;
    username: string;
    initials: string;
  };
  connectedChannelName: string | null;
  connectedServerName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnectVoice: () => void;
  onOpenSettings: () => void;
}

export function FloatingDock({
  currentUser,
  connectedChannelName,
  connectedServerName,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onDisconnectVoice,
  onOpenSettings,
}: FloatingDockProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-4 rounded-[14px] border border-pamplex-border bg-pamplex-surface/95 px-4 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-md">
        {/* Esquerda: Perfil do Utilizador */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pamplex-turquesa text-xs font-bold text-pamplex-dark">
              {currentUser.initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-pamplex-esmeralda ring-2 ring-pamplex-surface" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-semibold text-pamplex-text-primary">
              {currentUser.name}
            </span>
            <span className="truncate text-[11px] text-pamplex-text-muted">
              @{currentUser.username}
            </span>
          </div>
        </div>

        {/* Centro: Controles Principais de Áudio */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? "Ativar microfone" : "Silenciar microfone"}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors cursor-pointer",
              isMuted
                ? "border-pamplex-danger/40 bg-pamplex-danger/15 text-pamplex-danger"
                : "border-pamplex-border bg-pamplex-elevated text-pamplex-text-primary hover:border-pamplex-turquesa/50 hover:text-pamplex-turquesa",
            ].join(" ")}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleDeafen}
            title={isDeafened ? "Reativar áudio" : "Ensurdecer áudio"}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors cursor-pointer",
              isDeafened
                ? "border-pamplex-danger/40 bg-pamplex-danger/15 text-pamplex-danger"
                : "border-pamplex-border bg-pamplex-elevated text-pamplex-text-primary hover:border-pamplex-turquesa/50 hover:text-pamplex-turquesa",
            ].join(" ")}
          >
            {isDeafened ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </button>

          {connectedChannelName && (
            <button
              type="button"
              onClick={() => {
                playDigitalDisconnect();
                onDisconnectVoice();
              }}
              title="Desconectar da sala de voz"
              className="flex h-9 items-center gap-1.5 rounded-[10px] bg-pamplex-danger px-3 text-xs font-semibold text-pamplex-text-primary transition-all hover:brightness-110 cursor-pointer"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>

        {/* Direita: Estado da Ligação de Voz */}
        <div className="flex items-center gap-2.5 min-w-0">
          {connectedChannelName ? (
            <div className="hidden md:flex items-center gap-2 rounded-[10px] border border-pamplex-esmeralda/30 bg-pamplex-floresta-bg px-3 py-1.5">
              <Radio className="h-3.5 w-3.5 text-pamplex-esmeralda shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[11px] font-semibold text-pamplex-menta">
                  Voz Conectada • {connectedChannelName}
                </span>
                <span className="truncate text-[10px] text-pamplex-text-secondary">
                  {connectedServerName}
                </span>
              </div>
            </div>
          ) : (
            <span className="hidden md:inline text-xs text-pamplex-text-muted">
              Fora de chamada
            </span>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            title="Configurações"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-text-primary transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}