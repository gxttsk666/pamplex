"use client";

import React, { useMemo, useState } from "react";
import { Copy, Check, Hash, Sparkles } from "lucide-react";
import { ServerRail } from "@/components/app/ServerRail";
import { ChannelSidebar } from "@/components/app/ChannelSidebar";
import { DirectSidebar } from "@/components/app/DirectSidebar";
import { FriendsView } from "@/components/app/FriendsView";
import { ChatArea } from "@/components/app/ChatArea";
import { MemberList } from "@/components/app/MemberList";
import { FloatingDock } from "@/components/app/FloatingDock";
import {
  INITIAL_MEMBERS,
  INITIAL_MESSAGES,
  INITIAL_SERVERS,
  PamplexChannel,
  PamplexMember,
  PamplexMessage,
  PamplexServer,
} from "@/components/app/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function PamplexApp() {
  const [servers, setServers] = useState<PamplexServer[]>(INITIAL_SERVERS);
  const [isHomeActive, setIsHomeActive] = useState<boolean>(false);
  const [activeServerId, setActiveServerId] = useState<string>("s1");
  const [activeChannelId, setActiveChannelId] = useState<string>("c-text-2");
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>("c-voice-1");

  const [members, setMembers] = useState<PamplexMember[]>(INITIAL_MEMBERS);
  const [messages, setMessages] = useState<PamplexMessage[]>(INITIAL_MESSAGES);
  const [unreadByUserId, setUnreadByUserId] = useState<Record<string, number>>({ u2: 1 });
  const [showMembers, setShowMembers] = useState<boolean>(true);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);

  const [createServerOpen, setCreateServerOpen] = useState<boolean>(false);
  const [newServerName, setNewServerName] = useState<string>("");

  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  const activeServer = useMemo(
    () => servers.find((s) => s.id === activeServerId) ?? servers[0],
    [servers, activeServerId]
  );

  const activeChannel = useMemo(() => {
    const textChannels = activeServer.channels.filter((c) => c.type === "text");
    return (
      textChannels.find((c) => c.id === activeChannelId) ??
      textChannels[0] ??
      activeServer.channels[0]
    );
  }, [activeServer, activeChannelId]);

  const activeDmFriend = useMemo(
    () => (activeDmUserId ? members.find((m) => m.id === activeDmUserId) ?? null : null),
    [members, activeDmUserId]
  );

  const dmVirtualChannel: PamplexChannel | null = useMemo(() => {
    if (!activeDmFriend) return null;
    return {
      id: `dm-${activeDmFriend.id}`,
      name: activeDmFriend.name,
      type: "text",
      category: `@${activeDmFriend.username}`,
    };
  }, [activeDmFriend]);

  const currentChatChannel = isHomeActive ? dmVirtualChannel : activeChannel;

  const channelMessages = useMemo(() => {
    if (!currentChatChannel) return [];
    return messages.filter((m) => m.channelId === currentChatChannel.id);
  }, [messages, currentChatChannel]);

  const pendingRequestsCount = useMemo(
    () => members.filter((m) => m.relation === "pending_incoming").length,
    [members]
  );

  const totalUnreadDms = useMemo(
    () => Object.values(unreadByUserId).reduce((acc, n) => acc + n, 0),
    [unreadByUserId]
  );

  const connectedVoiceInfo = useMemo(() => {
    if (!connectedVoiceChannelId) return null;
    for (const srv of servers) {
      const ch = srv.channels.find((c) => c.id === connectedVoiceChannelId);
      if (ch) return { serverName: srv.name, channelName: ch.name };
    }
    return null;
  }, [servers, connectedVoiceChannelId]);

  const handleSelectHome = () => setIsHomeActive(true);

  const handleSelectServer = (serverId: string) => {
    setIsHomeActive(false);
    setActiveServerId(serverId);
    const target = servers.find((s) => s.id === serverId);
    const firstText = target?.channels.find((c) => c.type === "text");
    if (firstText) setActiveChannelId(firstText.id);
  };

  const handleSelectTextChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    setServers((prev) =>
      prev.map((srv) =>
        srv.id === activeServer.id
          ? {
              ...srv,
              channels: srv.channels.map((ch) =>
                ch.id === channelId ? { ...ch, unread: false } : ch
              ),
            }
          : srv
      )
    );
  };

  const handleSelectDmUser = (userId: string) => {
    setIsHomeActive(true);
    setActiveDmUserId(userId);
    setUnreadByUserId((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleAcceptFriendRequest = (userId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, relation: "friend" } : m))
    );
  };

  const handleDeclineFriendRequest = (userId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, relation: undefined } : m))
    );
  };const handleSendFriendRequest = (username: string): { ok: boolean; message: string } => {
    const clean = username.trim().toLowerCase();
    if (clean === "gustavo") {
      return { ok: false, message: "Você não pode adicionar a si mesmo." };
    }

    const existing = members.find((m) => m.username.toLowerCase() === clean);
    if (existing) {
      if (existing.relation === "friend") {
        return { ok: false, message: `@${existing.username} já está na sua lista de amigos.` };
      }
      if (existing.relation === "pending_incoming") {
        handleAcceptFriendRequest(existing.id);
        return { ok: true, message: `Pedido de @${existing.username} aceito automaticamente!` };
      }
      if (existing.relation === "pending_outgoing") {
        return { ok: false, message: `Já existe um pedido pendente para @${existing.username}.` };
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === existing.id ? { ...m, relation: "pending_outgoing" } : m))
      );
      return { ok: true, message: `Pedido de amizade enviado para @${existing.username}!` }; }  const displayName = clean.charAt(0).toUpperCase() + clean.slice(1); const newUser: PamplexMember = { id: `u-${Date.now()}`,
      name: displayName,
      username: clean,
      initials: clean.slice(0, 2).toUpperCase(),
      status: "online",
      accentColor: "bg-pamplex-aqua text-pamplex-dark",
      relation: "pending_outgoing",
    };
    setMembers((prev) => [...prev, newUser]);
    return { ok: true, message: `Pedido de amizade enviado para @${clean}!` }; };  const handleJoinVoiceChannel = (channelId: string) => { setConnectedVoiceChannelId(channelId); setMembers((prev) => prev.map((m) => m.id === "u1" ? { ...m, inVoiceChannelId: channelId, isSpeaking: !isMuted } : m ) ); };  const handleDisconnectVoice = () => { setConnectedVoiceChannelId(null); setMembers((prev) => prev.map((m) => m.id === "u1" ? { ...m, inVoiceChannelId: undefined, isSpeaking: false } : m ) ); };  const handleToggleMute = () => { setIsMuted((prev) => { const next = !prev; setMembers((list) => list.map((m) => m.id === "u1" ? { ...m, isMuted: next, isSpeaking: !next && Boolean(m.inVoiceChannelId) } : m ) ); return next; }); };  const handleToggleDeafen = () => setIsDeafened((prev) => !prev);  const handleSendMessage = (content: string) => { if (!currentChatChannel) return; const newMsg: PamplexMessage = { id: `m-${Date.now()}`,
      channelId: currentChatChannel.id,
      authorId: "u1",
      authorName: "Gustavo Kriguer",
      authorInitials: "GK",
      authorColor: "bg-pamplex-turquesa text-pamplex-dark",
      authorRole: isHomeActive ? undefined : "Fundador",
      content,
      timestamp: Date.now(),
      reactions: [],
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const existing = msg.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          const nextCount = existing.reacted ? existing.count - 1 : existing.count + 1;
          return {
            ...msg,
            reactions:
              nextCount <= 0
                ? msg.reactions.filter((r) => r.emoji !== emoji)
                : msg.reactions.map((r) =>
                    r.emoji === emoji ? { ...r, count: nextCount, reacted: !r.reacted } : r
                  ),
          };
        }
        return { ...msg, reactions: [...msg.reactions, { emoji, count: 1, reacted: true }] };
      })
    );
  };

  const handleCreateServer = () => {
    const cleanName = newServerName.trim() || "Nova Comunidade";
    const words = cleanName.split(" ").filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();

    const newId = `s-${Date.now()}`; const textId = `c-t-${Date.now()}`;
    const voiceId = `c-v-${Date.now()}`;  const created: PamplexServer = { id: newId, name: cleanName, initials, hasActiveVoice: false, isSpeakingNow: false, activeSpeakersInitials: [], channels: [ { id: textId, name: "geral", type: "text", category: "Canais de Texto" }, { id: voiceId, name: "Sala de Voz", type: "voice", category: "Canais de Voz" }, ], };  setServers((prev) => [...prev, created]); setIsHomeActive(false); setActiveServerId(newId); setActiveChannelId(textId); setNewServerName(""); setCreateServerOpen(false); };  const inviteUrl = `https://pamplex.app/convite/${activeServer.id}`;

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pamplex-bg text-pamplex-text-primary">
      <ServerRail
        servers={servers}
        activeServerId={activeServer.id}
        isHomeActive={isHomeActive}
        homeBadgeCount={pendingRequestsCount + totalUnreadDms}
        onSelectHome={handleSelectHome}
        onSelectServer={handleSelectServer}
        onOpenCreateServer={() => setCreateServerOpen(true)}
      />

      {isHomeActive ? (
        <DirectSidebar
          friends={members}
          activeDmUserId={activeDmUserId}
          pendingCount={pendingRequestsCount}
          unreadByUserId={unreadByUserId}
          onSelectFriendsTab={() => setActiveDmUserId(null)}
          onSelectDmUser={handleSelectDmUser}
        />
      ) : (
        <ChannelSidebar
          server={activeServer}
          activeChannelId={activeChannel.id}
          connectedVoiceChannelId={connectedVoiceChannelId}
          members={members}
          onSelectTextChannel={handleSelectTextChannel}
          onJoinVoiceChannel={handleJoinVoiceChannel}
          onOpenInviteModal={() => setInviteModalOpen(true)}
        />
      )}

      {isHomeActive && !currentChatChannel ? (
        <FriendsView
          members={members}
          onStartDm={handleSelectDmUser}
          onAcceptRequest={handleAcceptFriendRequest}
          onDeclineRequest={handleDeclineFriendRequest}
          onSendFriendRequest={handleSendFriendRequest}
        />
      ) : (
        currentChatChannel && (
          <ChatArea
            channel={currentChatChannel}
            messages={channelMessages}
            showMembers={!isHomeActive && showMembers}
            onToggleMembers={() => setShowMembers((prev) => !prev)}
            onSendMessage={handleSendMessage}
            onToggleReaction={handleToggleReaction}
          />
        )
      )}

      {!isHomeActive && showMembers && <MemberList members={members} />}

      <FloatingDock
        currentUser={{ name: "Gustavo Kriguer", username: "gustavo", initials: "GK" }}
        connectedChannelName={connectedVoiceInfo?.channelName ?? null}
        connectedServerName={connectedVoiceInfo?.serverName ?? null}
        isMuted={isMuted}
        isDeafened={isDeafened}
        onToggleMute={handleToggleMute}
        onToggleDeafen={handleToggleDeafen}
        onDisconnectVoice={handleDisconnectVoice}
      />

      <Modal
        open={createServerOpen}
        onClose={() => setCreateServerOpen(false)}
        title="Criar novo servidor"
        description="Crie um espaço organizado para amigos, equipa ou comunidade."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateServerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateServer}>
              <Sparkles className="h-4 w-4" />
              Criar Servidor
            </Button>
          </>
        }
      >
        <Input
          label="Nome do servidor"
          placeholder="Ex: Oficina 3D & Projetos"
          leftIcon={<Hash className="h-4 w-4" />}
          value={newServerName}
          onChange={(e) => setNewServerName(e.target.value)}
        />
      </Modal>

      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={`Convidar para ${activeServer.name}`}
        description="Partilhe este link direto para entrar no servidor."
        footer={
          <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>
            Concluir
          </Button>
        }
      >
        <div className="flex items-end gap-2">
          <Input label="Link de convite" value={inviteUrl} readOnly />
          <Button variant="primary" onClick={handleCopyInvite}>
            {copiedInvite ? (
              <>
                <Check className="h-4 w-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar
              </>
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}