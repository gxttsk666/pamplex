"use client";

import React, { useMemo, useState } from "react";
import { Folder, FolderOpen, Plus } from "lucide-react";
import { PamplexServer } from "./types";

interface ServerRailProps {
  servers: PamplexServer[];
  activeServerId: string;
  isHomeActive: boolean;
  homeBadgeCount: number;
  onSelectHome: () => void;
  onSelectServer: (serverId: string) => void;
  onOpenCreateServer: () => void;
}

export function ServerRail({
  servers,
  activeServerId,
  isHomeActive,
  homeBadgeCount,
  onSelectHome,
  onSelectServer,
  onOpenCreateServer,
}: ServerRailProps) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    Projetos: true,
  });

  const { rootServers, folderMap } = useMemo(() => {
    const roots: PamplexServer[] = [];
    const folders: Record<string, PamplexServer[]> = {};

    for (const srv of servers) {
      if (srv.folder) {
        if (!folders[srv.folder]) folders[srv.folder] = [];
        folders[srv.folder].push(srv);
      } else {
        roots.push(srv);
      }
    }
    return { rootServers: roots, folderMap: folders };
  }, [servers]);

  const toggleFolder = (folderName: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const renderServerButton = (server: PamplexServer) => {
    const isActive = !isHomeActive && server.id === activeServerId;

    return (
      <div key={server.id} className="relative flex w-full items-center justify-center">
        {/* Indicador lateral ativo */}
        <span
          className={[
            "absolute left-0 w-1 rounded-r-full bg-pamplex-turquesa transition-all duration-150",
            isActive ? "h-8 opacity-100" : "h-0 opacity-0",
          ].join(" ")}
        />

        <button
          type="button"
          onClick={() => onSelectServer(server.id)}
          title={`${server.name}${server.hasActiveVoice ? " • Voz ativa" : ""}`}
          className={[
            "group relative flex h-12 w-12 items-center justify-center font-semibold text-sm transition-all duration-150 cursor-pointer select-none",
            isActive
              ? "rounded-[14px] bg-pamplex-turquesa text-pamplex-dark shadow-md"
              : "rounded-[18px] bg-pamplex-surface text-pamplex-text-primary hover:rounded-[14px] hover:bg-pamplex-elevated",
            server.hasActiveVoice && !isActive
              ? "ring-2 ring-pamplex-esmeralda/80"
              : "",
          ].join(" ")}
        >
          <span>{server.initials}</span>

          {/* Radar Vivo: ponto pulsante quando há alguém falando */}
          {server.hasActiveVoice && (
            <span
              className={[
                "absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pamplex-dark",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full bg-pamplex-esmeralda",
                  server.isSpeakingNow ? "animate-ping" : "",
                ].join(" ")}
              />
              {server.isSpeakingNow && (
                <span className="absolute h-2.5 w-2.5 rounded-full bg-pamplex-esmeralda" />
              )}
            </span>
          )}

          {/* Micro-avatares de quem está em call agora */}
          {server.activeSpeakersInitials.length > 0 && (
            <div className="absolute -bottom-1.5 flex -space-x-1.5">
              {server.activeSpeakersInitials.slice(0, 2).map((initials) => (
                <span
                  key={initials}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-pamplex-dark bg-pamplex-floresta text-[8px] font-bold text-pamplex-menta"
                >
                  {initials}
                </span>
              ))}
            </div>
          )}
        </button>
      </div>
    );
  };

  return (
    <nav
      aria-label="Servidores"
      className="flex h-full w-[72px] shrink-0 flex-col items-center border-r border-pamplex-border bg-pamplex-dark py-3 gap-2 select-none"
    >
      {/* Botão P (Início / Mensagens Diretas e Amigos) */}
      <div className="relative flex w-full items-center justify-center">
        <span
          className={[
            "absolute left-0 w-1 rounded-r-full bg-pamplex-turquesa transition-all duration-150",
            isHomeActive ? "h-8 opacity-100" : "h-0 opacity-0",
          ].join(" ")}
        />

        <button
          type="button"
          onClick={onSelectHome}
          title="Início • Mensagens Diretas e Amigos"
          className={[
            "relative flex h-12 w-12 items-center justify-center font-bold text-base tracking-tight transition-all duration-150 cursor-pointer",
            isHomeActive
              ? "rounded-[14px] bg-pamplex-turquesa text-pamplex-dark shadow-md"
              : "rounded-[18px] bg-pamplex-surface text-pamplex-turquesa hover:rounded-[14px] hover:bg-pamplex-turquesa hover:text-pamplex-dark",
          ].join(" ")}
        >
          P

          {homeBadgeCount > 0 && (
            <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-pamplex-dark bg-pamplex-esmeralda px-1 text-[10px] font-bold text-pamplex-dark">
              {homeBadgeCount}
            </span>
          )}
        </button>
      </div>

      <div className="h-px w-8 bg-pamplex-border my-1" />

      {/* Lista de Servidores e Pastas */}
      <div className="flex w-full flex-1 flex-col items-center gap-2.5 overflow-y-auto pb-24">
        {rootServers.map(renderServerButton)}

        {Object.entries(folderMap).map(([folderName, items]) => {
          const isOpen = Boolean(openFolders[folderName]);
          const folderHasVoice = items.some((s) => s.hasActiveVoice);

          return (
            <div
              key={folderName}
              className="flex flex-col items-center gap-2 rounded-[16px] bg-pamplex-surface/60 p-1.5 border border-pamplex-border/60"
            >
              <button
                type="button"
                onClick={() => toggleFolder(folderName)}
                title={`Pasta ${folderName}`}
                className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-pamplex-text-secondary hover:bg-pamplex-elevated hover:text-pamplex-turquesa transition-colors cursor-pointer"
              >
                {isOpen ? (
                  <FolderOpen className="h-4 w-4 text-pamplex-turquesa" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
                {!isOpen && folderHasVoice && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-pamplex-esmeralda" />
                )}
              </button>

              {isOpen && (
                <div className="flex flex-col items-center gap-2">
                  {items.map(renderServerButton)}
                </div>
              )}
            </div>
          );
        })}

        {/* Botão Criar Novo Servidor */}
        <button
          type="button"
          onClick={onOpenCreateServer}
          title="Criar novo servidor"
          className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-dashed border-pamplex-border bg-pamplex-surface/50 text-pamplex-turquesa hover:rounded-[14px] hover:border-pamplex-turquesa hover:bg-pamplex-turquesa/10 transition-all cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}