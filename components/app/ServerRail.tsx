"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, Plus } from "lucide-react";
import { PamplexServer } from "./types";

interface ServerRailProps {
  servers: PamplexServer[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  onOpenCreateServer: () => void;
}

export function ServerRail({
  servers,
  activeServerId,
  onSelectServer,
  onOpenCreateServer,
}: ServerRailProps) {
  const [folderOpen, setFolderOpen] = useState(true);

  const rootServers = servers.filter((s) => !s.folder);
  const folderServers = servers.filter((s) => Boolean(s.folder));

  const renderServerButton = (server: PamplexServer, compact = false) => {
    const isActive = server.id === activeServerId;

    return (
      <div key={server.id} className="relative flex items-center justify-center group">
        {/* Indicador lateral de servidor ativo */}
        <span
          className={[
            "absolute left-0 w-1 rounded-r-full bg-pamplex-turquesa transition-all duration-150",
            isActive
              ? "h-8 opacity-100"
              : "h-2 opacity-0 group-hover:h-4 group-hover:opacity-70",
          ].join(" ")}
        />

        <button
          type="button"
          onClick={() => onSelectServer(server.id)}
          title={server.name}
          className={[
            "relative flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pamplex-turquesa",
            compact ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm",
            isActive
              ? "rounded-[14px] bg-pamplex-turquesa text-pamplex-dark shadow-md shadow-pamplex-turquesa/20"
              : "rounded-[16px] bg-pamplex-surface text-pamplex-text-primary hover:rounded-[14px] hover:bg-pamplex-elevated",
            server.hasActiveVoice && !isActive
              ? server.isSpeakingNow
                ? "ring-2 ring-pamplex-esmeralda animate-radar-vivo"
                : "ring-1 ring-pamplex-esmeralda/60"
              : "",
          ].join(" ")}
        >
          {server.initials}

          {/* Micro-avatares do Radar Vivo */}
          {server.hasActiveVoice && server.activeSpeakersInitials.length > 0 && (
            <div className="absolute -bottom-1 -right-1 flex -space-x-1.5 pointer-events-none">
              {server.activeSpeakersInitials.slice(0, 2).map((init, idx) => (
                <span
                  key={`${server.id}-spk-${idx}`}
                  className={[
                    "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ring-2 ring-pamplex-dark",
                    idx === 0
                      ? "bg-pamplex-esmeralda text-pamplex-dark"
                      : "bg-pamplex-turquesa text-pamplex-dark",
                  ].join(" ")}
                >
                  {init}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>
    );
  };

  return (
    <aside
      aria-label="Servidores"
      className="flex h-full w-[72px] shrink-0 flex-col items-center bg-pamplex-dark border-r border-pamplex-border py-3 gap-2 select-none"
    >
      {/* Logo Pamplex / Início */}
      <button
        type="button"
        onClick={() => onSelectServer("s1")}
        title="Início • Pamplex"
        className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-pamplex-floresta-bg border border-pamplex-turquesa/30 text-pamplex-turquesa font-bold text-lg transition-all hover:bg-pamplex-turquesa hover:text-pamplex-dark cursor-pointer"
      >
        P
      </button>

      <div className="h-[1px] w-8 bg-pamplex-border my-1" />

      {/* Lista de servidores principais */}
      <div className="flex flex-1 flex-col items-center gap-2.5 overflow-y-auto w-full py-1">
        {rootServers.map((server) => renderServerButton(server))}

        {/* Pasta agrupada de servidores */}
        {folderServers.length > 0 && (
          <div className="flex flex-col items-center gap-2 rounded-[14px] bg-pamplex-sidebar/90 border border-pamplex-border/70 p-1.5">
            <button
              type="button"
              onClick={() => setFolderOpen((prev) => !prev)}
              title={folderOpen ? "Recolher pasta Projetos" : "Expandir pasta Projetos"}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-pamplex-aqua hover:bg-pamplex-elevated transition-colors cursor-pointer"
            >
              {folderOpen ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
            </button>

            {folderOpen &&
              folderServers.map((server) => renderServerButton(server, true))}
          </div>
        )}

        {/* Botão Criar Novo Servidor */}
        <button
          type="button"
          onClick={onOpenCreateServer}
          title="Criar ou entrar em servidor"
          className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-pamplex-surface border border-dashed border-pamplex-border text-pamplex-esmeralda transition-all hover:rounded-[14px] hover:border-pamplex-esmeralda hover:bg-pamplex-floresta-bg cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}