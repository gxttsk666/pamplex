"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { createClient } from "@/lib/supabase/client";
import { playDigitalConnect, playDigitalDisconnect, playDigitalMute, playDigitalUnmute } from "@/lib/sounds";

interface VoiceRoomModalProps {
  roomName: string;
  username: string;
  onDisconnect: () => void;
}

function VoiceRoomInner({ onDisconnect }: { onDisconnect: () => void }) {
  // `isMicrophoneEnabled` já é reativo: não precisa de polling
  const { isMicrophoneEnabled } = useLocalParticipant();
  const previousMicRef = useRef<boolean | null>(null);

  useEffect(() => {
    const previous = previousMicRef.current;
    previousMicRef.current = isMicrophoneEnabled;
    if (previous === null || previous === isMicrophoneEnabled) return; // ignora o estado inicial
    if (isMicrophoneEnabled) playDigitalUnmute();
    else playDigitalMute();
  }, [isMicrophoneEnabled]);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-pamplex-border bg-pamplex-surface p-4 shadow-2xl w-80 text-pamplex-text-primary">
      <div className="flex items-center justify-between border-b border-pamplex-border pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold truncate max-w-[180px]">Voz Ativa</span>
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

      <RoomAudioRenderer />

      <div className="flex items-center justify-center gap-2 pt-1">
        <ControlBar variation="minimal" />
      </div>
    </div>
  );
}

export function VoiceRoomModal({ roomName, username, onDisconnect }: VoiceRoomModalProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, username, supabase]);

  if (errorMsg) {
    return (
      <div className="fixed bottom-20 right-5 z-50 flex flex-col gap-2 rounded-xl border border-red-500/40 bg-pamplex-surface p-4 shadow-2xl w-80 text-xs">
        <span className="font-bold text-red-400">Não foi possível entrar na chamada</span>
        <p className="text-pamplex-text-secondary">{errorMsg}</p>
        <button
          type="button"
          onClick={onDisconnect}
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
        <VoiceRoomInner onDisconnect={onDisconnect} />
      </LiveKitRoom>
    </div>
  );
}