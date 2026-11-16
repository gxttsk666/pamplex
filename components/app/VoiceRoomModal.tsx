"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  playDigitalConnect,
  playDigitalDisconnect,
  playDigitalMute,
  playDigitalUnmute,
} from "@/lib/sounds";

export interface VoiceParticipant {
  id: string;
  muted: boolean;
}

interface VoiceRoomModalProps {
  roomName: string;
  username: string;
  muted: boolean;
  deafened?: boolean;
  onDisconnect: () => void;
  onParticipantsChange: (participants: VoiceParticipant[]) => void;
}

function VoiceRoomInner({
  muted,
  deafened = false,
  onDisconnect,
  onParticipantsChange,
}: {
  muted: boolean;
  deafened?: boolean;
  onDisconnect: () => void;
  onParticipantsChange: (participants: VoiceParticipant[]) => void;
}) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const previousMicRef = useRef<boolean | null>(null);

  // Sincroniza o estado externo de mute com o microfone real no LiveKit
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(!muted).catch(() => {});
  }, [muted, localParticipant]);

  // Toca o som digital sempre que o estado real do microfone muda (ignora a leitura inicial)
  useEffect(() => {
    const previous = previousMicRef.current;
    previousMicRef.current = isMicrophoneEnabled;
    if (previous === null || previous === isMicrophoneEnabled) return;
    if (isMicrophoneEnabled) playDigitalUnmute();
    else playDigitalMute();
  }, [isMicrophoneEnabled]);

  // Envia a lista ao vivo de participantes (identity = Supabase user.id) para o page.tsx
  useEffect(() => {
    const list: VoiceParticipant[] = participants.map((p) => ({
      id: p.identity,
      muted: !p.isMicrophoneEnabled,
    }));
    onParticipantsChange(list);
  }, [participants, onParticipantsChange]);

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-pamplex-border bg-pamplex-surface p-4 shadow-2xl w-80 text-pamplex-text-primary">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-pamplex-border pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold truncate max-w-[180px]">
            Voz Ativa — {participants.length} {participants.length === 1 ? "pessoa" : "pessoas"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            playDigitalDisconnect();
            onDisconnect();
          }}
          className="rounded-[6px] bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 cursor-pointer"
        >
          Desconectar
        </button>
      </div>

      {/* Áudio remoto — mutado automaticamente se o utilizador ativar Deafen no Dock */}
      <RoomAudioRenderer muted={deafened} />

      {/* Lista de participantes na chamada */}
      {participants.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pt-0.5">
          {participants.map((p) => {
            const displayName = p.name || p.identity || "Membro";
            const micOn = p.isMicrophoneEnabled;
            const speaking = p.isSpeaking;

            return (
              <div
                key={p.sid}
                className="flex items-center justify-between rounded-lg bg-pamplex-dark/60 px-2.5 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                      speaking
                        ? "bg-emerald-500 text-pamplex-dark ring-2 ring-emerald-400/60"
                        : micOn
                          ? "bg-pamplex-turquesa/20 text-pamplex-turquesa"
                          : "bg-pamplex-elevated text-pamplex-text-muted opacity-60",
                    ].join(" ")}
                  >
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate font-medium text-pamplex-text-primary">
                    {displayName}
                    {p.isLocal ? " (você)" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {speaking && <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />}
                  {micOn ? (
                    <Mic className="h-3.5 w-3.5 text-pamplex-text-secondary" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VoiceRoomModal({
  roomName,
  username,
  muted,
  deafened = false,
  onDisconnect,
  onParticipantsChange,
}: VoiceRoomModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    setErrorMsg(null);

    const fetchToken = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const res = await fetch(
          `/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(username)}`,
          { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } }
        );
        const data = await res.json();

        if (!active) return;
        if (!res.ok || !data.token) {
          const msg = data.error ?? `Erro HTTP ${res.status}`;
          console.error("Erro ao obter token LiveKit:", msg);
          setErrorMsg(msg);
          return;
        }

        playDigitalConnect();
        setServerUrl(data.url ?? process.env.NEXT_PUBLIC_LIVEKIT_URL);
        setToken(data.token);
      } catch (err) {
        console.error("Erro ao obter token LiveKit:", err);
        if (active) setErrorMsg("Falha de rede ao conectar no servidor de voz.");
      }
    };

    fetchToken();
    return () => {
      active = false;
    };
  }, [roomName, username, supabase]);

  if (errorMsg) {
    return (
      <div className="fixed bottom-20 right-5 z-50 flex flex-col gap-2 rounded-xl border border-red-500/40 bg-pamplex-surface p-4 shadow-2xl w-80 text-xs">
        <span className="font-bold text-red-400">Não foi possível entrar na chamada</span>
        <p className="text-pamplex-text-secondary">{errorMsg}</p>
        <button
          type="button"
          onClick={() => {
            playDigitalDisconnect();
            onDisconnect();
          }}
          className="mt-1 self-end rounded-md bg-red-500/20 px-3 py-1 text-red-300 hover:bg-red-500/30 cursor-pointer"
        >
          Fechar
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed bottom-20 right-5 z-50 flex items-center gap-3 rounded-xl border border-pamplex-border bg-pamplex-surface px-4 py-3 shadow-2xl text-xs text-pamplex-text-secondary">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-pamplex-turquesa border-t-transparent" />
        <span>Conectando à sala de voz...</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-5 z-50">
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onError={(err) => {
          console.error("Erro LiveKitRoom:", err);
          setErrorMsg(err.message);
        }}
        onDisconnected={() => {
          playDigitalDisconnect();
          onDisconnect();
        }}
      >
        <VoiceRoomInner
          muted={muted}
          deafened={deafened}
          onDisconnect={onDisconnect}
          onParticipantsChange={onParticipantsChange}
        />
      </LiveKitRoom>
    </div>
  );
}