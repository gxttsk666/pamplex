"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { Maximize2, MonitorUp, X } from "lucide-react";
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
  screenSharing?: boolean;
  onScreenShareChange?: (sharing: boolean) => void;
  onDisconnect: () => void;
  onParticipantsChange: (participants: VoiceParticipant[]) => void;
}

function VoiceRoomInner({
  muted,
  deafened = false,
  screenSharing = false,
  onScreenShareChange,
  onParticipantsChange,
}: {
  muted: boolean;
  deafened?: boolean;
  screenSharing?: boolean;
  onScreenShareChange?: (sharing: boolean) => void;
  onParticipantsChange: (participants: VoiceParticipant[]) => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const participants = useParticipants();
  const previousMicRef = useRef<boolean | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Captura transmissões de tela ativas na sala
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const activeScreenTrack = screenTracks[0];

  // Sincroniza Mute externo com LiveKit
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(!muted).catch(() => {});
  }, [muted, localParticipant]);

  // Sincroniza Compartilhamento de Tela com LiveKit
  useEffect(() => {
    if (!localParticipant) return;
    if (localParticipant.isScreenShareEnabled !== screenSharing) {
      localParticipant
        .setScreenShareEnabled(screenSharing, { audio: true })
        .catch(() => {
          // Caso o utilizador cancele na janela do navegador
          onScreenShareChange?.(false);
        });
    }
  }, [screenSharing, localParticipant, onScreenShareChange]);

  // Avisa o page.tsx caso o utilizador pare o compartilhamento pela barra nativa do navegador ("Interromper compartilhamento")
  useEffect(() => {
    onScreenShareChange?.(isScreenShareEnabled);
  }, [isScreenShareEnabled, onScreenShareChange]);

  // Sons de mutar/desmutar
  useEffect(() => {
    const previous = previousMicRef.current;
    previousMicRef.current = isMicrophoneEnabled;
    if (previous === null || previous === isMicrophoneEnabled) return;
    if (isMicrophoneEnabled) playDigitalUnmute();
    else playDigitalMute();
  }, [isMicrophoneEnabled]);

  // Reporta participantes para a barra lateral
  useEffect(() => {
    const list: VoiceParticipant[] = participants.map((p) => ({
      id: p.identity,
      muted: !p.isMicrophoneEnabled,
    }));
    onParticipantsChange(list);
  }, [participants, onParticipantsChange]);

  const handleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    }
  };

  return (
    <>
      {/* Áudio remoto sempre ativo em segundo plano */}
      <RoomAudioRenderer muted={deafened} />

      {/* Só mostra janela na tela se houver alguém compartilhando tela */}
      {activeScreenTrack && (
        <div
          ref={videoContainerRef}
          className="fixed bottom-20 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-pamplex-border bg-pamplex-surface shadow-2xl w-[420px] max-w-[92vw]"
        >
          <div className="flex items-center justify-between border-b border-pamplex-border px-3 py-2 bg-pamplex-dark/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MonitorUp className="h-3.5 w-3.5 text-pamplex-turquesa shrink-0" />
              <span className="truncate font-semibold text-pamplex-text-primary">
                Tela de{" "}
                {activeScreenTrack.participant.name ||
                  activeScreenTrack.participant.identity}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleFullscreen}
                title="Tela cheia"
                className="rounded-md p-1 text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-text-primary cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              {activeScreenTrack.participant.isLocal && (
                <button
                  type="button"
                  onClick={() => onScreenShareChange?.(false)}
                  title="Parar compartilhamento"
                  className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400 hover:bg-red-500/25 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  Parar
                </button>
              )}
            </div>
          </div>

          <div className="relative aspect-video w-full bg-black">
            <VideoTrack
              trackRef={activeScreenTrack}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function VoiceRoomModal({
  roomName,
  username,
  muted,
  deafened = false,
  screenSharing = false,
  onScreenShareChange,
  onDisconnect,
  onParticipantsChange,
}: VoiceRoomModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const isReloadingRef = useRef(false);

  // Marca que a desconexão foi causada por um reload de página,
  // para que o onDisconnected do LiveKitRoom não limpe o estado de voz.
  useEffect(() => {
    const handleBeforeUnload = () => {
      isReloadingRef.current = true;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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
          setErrorMsg(data.error ?? `Erro HTTP ${res.status}`);
          return;
        }

        playDigitalConnect();
        setServerUrl(data.url ?? process.env.NEXT_PUBLIC_LIVEKIT_URL);
        setToken(data.token);
      } catch {
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

  if (!token) return null;

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      onError={(err) => setErrorMsg(err.message)}
      onDisconnected={() => {
        if (isReloadingRef.current) return;
        playDigitalDisconnect();
        onDisconnect();
      }}
    >
      <VoiceRoomInner
        muted={muted}
        deafened={deafened}
        screenSharing={screenSharing}
        onScreenShareChange={onScreenShareChange}
        onParticipantsChange={onParticipantsChange}
      />
    </LiveKitRoom>
  );
}