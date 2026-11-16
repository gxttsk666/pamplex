"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useRoomContext,
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
  cameraOn?: boolean;
  onScreenShareChange?: (sharing: boolean) => void;
  onCameraChange?: (on: boolean) => void;
  onDisconnect: () => void;
  onParticipantsChange: (participants: VoiceParticipant[]) => void;
}

function VoiceRoomInner({
  muted,
  deafened = false,
  screenSharing = false,
  cameraOn = false,
  onScreenShareChange,
  onCameraChange,
  onParticipantsChange,
}: {
  muted: boolean;
  deafened?: boolean;
  screenSharing?: boolean;
  cameraOn?: boolean;
  onScreenShareChange?: (sharing: boolean) => void;
  onCameraChange?: (on: boolean) => void;
  onParticipantsChange: (participants: VoiceParticipant[]) => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isScreenShareEnabled, isCameraEnabled } =
    useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const previousMicRef = useRef<boolean | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [, setScreenTrackVersion] = useState(0);

  // Captura transmissões de tela e câmara ativas na sala
  const screenTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const activeScreenTrack = screenTracks[0];
  // Apenas câmeras com vídeo realmente ativo (não publicadas mas desligadas)
  const activeCameraTracks = cameraTracks.filter(
    (t) => t.publication?.isMuted === false && t.publication?.track != null
  );

  // Monitora mudanças nos tracks remotos para atualizar em tempo real
  useEffect(() => {
    if (!room) return;
    const handler = () => setScreenTrackVersion((v) => v + 1);
    room.on("trackSubscribed", handler);
    room.on("trackUnsubscribed", handler);
    return () => {
      room.off("trackSubscribed", handler);
      room.off("trackUnsubscribed", handler);
    };
  }, [room]);

  // Sincroniza Mute externo com LiveKit
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(!muted).catch(() => {});
  }, [muted, localParticipant]);

  // Aplica dispositivo de microfone selecionado nas configurações
  useEffect(() => {
    if (!room) return;
    try {
      const saved = sessionStorage.getItem("pamplex_audio_input");
      if (saved && saved !== "default") {
        room.switchActiveDevice("audioinput", saved).catch(() => {});
      }
    } catch { /* Sem storage */ }
  }, [room]);

  // Aplica dispositivo de saída de áudio selecionado nas configurações
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pamplex_audio_output");
      if (saved && saved !== "default" && "setSinkId" in HTMLAudioElement.prototype) {
        const audioEls = document.getElementsByTagName("audio");
        Array.from(audioEls).forEach((el) => {
          (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
            .setSinkId(saved).catch(() => {});
        });
      }
    } catch { /* Sem storage */ }
  }, [room]);

  // Sincroniza Câmara com LiveKit
  useEffect(() => {
    if (!localParticipant) return;
    if (localParticipant.isCameraEnabled !== cameraOn) {
      localParticipant.setCameraEnabled(cameraOn).catch(() => {
        onCameraChange?.(false);
      });
    }
  }, [cameraOn, localParticipant, onCameraChange]);

  // Avisa page.tsx se câmara for desligada externamente
  useEffect(() => {
    onCameraChange?.(isCameraEnabled);
  }, [isCameraEnabled, onCameraChange]);

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

      {/* Janela flutuante: tela compartilhada + câmeras ativas */}
      {(activeScreenTrack || activeCameraTracks.length > 0) && (
        <div
          ref={videoContainerRef}
          className="fixed bottom-20 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-pamplex-border bg-pamplex-surface shadow-2xl w-[420px] max-w-[92vw]"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-pamplex-border px-3 py-2 bg-pamplex-dark/80 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MonitorUp className="h-3.5 w-3.5 text-pamplex-turquesa shrink-0" />
              <span className="truncate font-semibold text-pamplex-text-primary">
                {activeScreenTrack
                  ? `Tela de ${activeScreenTrack.participant.name || activeScreenTrack.participant.identity}`
                  : "Câmera na chamada"}
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
              {activeScreenTrack?.participant.isLocal && (
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

          {/* Vídeo principal: tela compartilhada tem prioridade */}
          {activeScreenTrack && (
            <div className="relative aspect-video w-full bg-black">
              <VideoTrack
                trackRef={activeScreenTrack}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          {/* Grid de câmeras (locais e remotas) */}
          {activeCameraTracks.length > 0 && (
            <div className={[
              "grid gap-1 p-1 bg-pamplex-dark",
              activeCameraTracks.length === 1 ? "grid-cols-1" : "grid-cols-2",
            ].join(" ")}>
              {activeCameraTracks.map((trackRef) => (
                <div key={`${trackRef.participant.identity}-cam`} className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoTrack
                    trackRef={trackRef}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 left-2 text-[10px] text-white/80 font-medium drop-shadow">
                    {trackRef.participant.isLocal ? "Você" : (trackRef.participant.name || trackRef.participant.identity)}
                  </span>
                </div>
              ))}
            </div>
          )}
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
  cameraOn = false,
  onScreenShareChange,
  onCameraChange,
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
        cameraOn={cameraOn}
        onScreenShareChange={onScreenShareChange}
        onCameraChange={onCameraChange}
        onParticipantsChange={onParticipantsChange}
      />
    </LiveKitRoom>
  );
}