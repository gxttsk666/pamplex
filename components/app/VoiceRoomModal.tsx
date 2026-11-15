"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);

  // Monitora mudanças no estado do microfone para tocar mute/unmute localmente
  useEffect(() => {
    if (!localParticipant) return;
    const checkMicrophone = () => {
      const muted = !localParticipant.isMicrophoneEnabled;
      if (muted !== isMuted) {
        if (muted) {
          playDigitalMute();
        } else {
          playDigitalUnmute();
        }
        setIsMuted(muted);
      }
    };

    const interval = setInterval(checkMicrophone, 300);
    return () => clearInterval(interval);
  }, [localParticipant, isMuted]);

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
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    // Toca o som de Digital Connect assim que entra na sala
    playDigitalConnect();

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
          console.error("Erro ao obter token LiveKit:", data.error ?? res.status);
          onDisconnect();
          return;
        }
        setToken(data.token);
      } catch (err) {
        console.error("Erro ao obter token LiveKit:", err);
        if (active) onDisconnect();
      }
    };

    fetchToken();
    return () => {
      active = false;
    };
    // onDisconnect muda a cada render do pai; só queremos refazer o token ao trocar de sala
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, username, supabase]);

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
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
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