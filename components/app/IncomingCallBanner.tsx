"use client";

import { useEffect, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { playIncomingCall } from "@/lib/sounds";

export interface IncomingCall {
  fromUserId: string;
  fromName: string;
  roomName: string;
}

interface IncomingCallBannerProps {
  call: IncomingCall;
  onAccept: (roomName: string) => void;
  onDecline: () => void;
}

export function IncomingCallBanner({ call, onAccept, onDecline }: IncomingCallBannerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Toca o som imediatamente e depois a cada 2.5s
    playIncomingCall();
    intervalRef.current = setInterval(() => {
      playIncomingCall();
    }, 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-4 rounded-2xl border border-pamplex-border bg-pamplex-surface/95 px-5 py-3.5 shadow-2xl shadow-black/60 backdrop-blur-md w-80 max-w-[92vw]">
      {/* Avatar / ícone */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pamplex-turquesa/20 border border-pamplex-turquesa/40">
        <Phone className="h-4 w-4 text-pamplex-turquesa animate-pulse" />
      </div>

      {/* Texto */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate text-xs font-semibold text-pamplex-text-primary">
          {call.fromName}
        </span>
        <span className="text-[11px] text-pamplex-text-muted">Chamada de voz recebida</span>
      </div>

      {/* Botões */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onAccept(call.roomName)}
          title="Aceitar chamada"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-pamplex-esmeralda text-white hover:brightness-110 transition cursor-pointer"
        >
          <Phone className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDecline}
          title="Recusar chamada"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-pamplex-danger text-white hover:brightness-110 transition cursor-pointer"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
