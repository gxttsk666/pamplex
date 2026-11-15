"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Check, Hash, Sparkles, LogOut, Plus, UserPlus, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { ServerRail } from "@/components/app/ServerRail";
import { ChannelSidebar } from "@/components/app/ChannelSidebar";
import { DirectSidebar } from "@/components/app/DirectSidebar";
import { FriendsView } from "@/components/app/FriendsView";
import { ChatArea } from "@/components/app/ChatArea";
import { MemberList } from "@/components/app/MemberList";
import { FloatingDock } from "@/components/app/FloatingDock";
import {
  PamplexChannel,
  PamplexMember,
  PamplexMessage,
  PamplexServer,
} from "@/components/app/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function PamplexApp() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [servers, setServers] = useState<PamplexServer[]>([]);
  const [isHomeActive, setIsHomeActive] = useState<boolean>(true);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [navRestored, setNavRestored] = useState<boolean>(false);

  const [members, setMembers] = useState<PamplexMember[]>([]);
  const [activeServerMemberIds, setActiveServerMemberIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<PamplexMessage[]>([]);
  const [unreadByUserId, setUnreadByUserId] = useState<Record<string, number>>({});
  const [showMembers, setShowMembers] = useState<boolean>(true);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);

  // Modal Criar ou Entrar em Servidor
  const [createServerOpen, setCreateServerOpen] = useState<boolean>(false);
  const [serverModalTab, setServerModalTab] = useState<"create" | "join">("create");
  const [newServerName, setNewServerName] = useState<string>("");
  const [joinInviteInput, setJoinInviteInput] = useState<string>("");
  const [joinError, setJoinError] = useState<string | null>(null);

  // Modal Criar Novo Canal
  const [createChannelOpen, setCreateChannelOpen] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");

  // Modal Convidar
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  // 0. Recupera e guarda a última posição de navegação no navegador
  useEffect(() => {
    const savedState = localStorage.getItem("pamplex_nav_state");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (typeof parsed.isHomeActive === "boolean") setIsHomeActive(parsed.isHomeActive);
        if (parsed.activeServerId) setActiveServerId(parsed.activeServerId);
        if (parsed.activeChannelId) setActiveChannelId(parsed.activeChannelId);
        if (parsed.activeDmUserId !== undefined) setActiveDmUserId(parsed.activeDmUserId);
      } catch {
        // Ignora JSON inválido
      }
    }
    setNavRestored(true);
  }, []);

  useEffect(() => {
    if (!navRestored) return;
    localStorage.setItem(
      "pamplex_nav_state",
      JSON.stringify({
        isHomeActive,
        activeServerId,
        activeChannelId,
        activeDmUserId,
      })
    );
  }, [navRestored, isHomeActive, activeServerId, activeChannelId, activeDmUserId]);

  // 1. Verificar autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthModalOpen(!currentUser);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthModalOpen(!currentUser);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Carrega perfis e valida status online (baseado em atividade recente < 2 minutos)
  const syncFriendsAndProfiles = useCallback(async () => {
    if (!user) return;

    const [{ data: profilesData }, { data: friendshipsData }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
    ]);

    if (!profilesData) return;

    const now = Date.now();
    const realMembers: PamplexMember[] = profilesData
      .filter((p: any) => p.id !== user.id)
      .map((p: any) => {
        const relationRecord = (friendshipsData || []).find(
          (f: any) =>
            (f.user_id === user.id && f.friend_id === p.id) ||
            (f.friend_id === user.id && f.user_id === p.id)
        );

        let relation: PamplexMember["relation"] = undefined;
        if (relationRecord) {
          if (relationRecord.status === "accepted") {
            relation = "friend";
          } else if (relationRecord.user_id === user.id) {
            relation = "pending_outgoing";
          } else {
            relation = "pending_incoming";
          }
        }

        const lastSeen = p.updated_at ? new Date(p.updated_at).getTime() : 0;
        const isRecent = now - lastSeen < 120000; // 2 minutos
        const calculatedStatus = isRecent ? ((p.status as PamplexMember["status"]) || "online") : "offline";

        const displayName = p.display_name || p.username || "Membro";
        const words = displayName.trim().split(" ").filter(Boolean);
        const initials =
          words.length >= 2
            ? `${words[0][0]}${words[1][0]}`.toUpperCase()
            : displayName.slice(0, 2).toUpperCase();

        return {
          id: p.id,
          name: displayName,
          username: p.username,
          initials,
          status: calculatedStatus,
          accentColor: "bg-pamplex-turquesa text-pamplex-dark",
          relation,
        };
      });

    setMembers(realMembers);
  }, [user, supabase]);

  // Batimento cardíaco para manter o próprio status ativo
  useEffect(() => {
    if (!user) return;
    const updatePresence = async () => {
      await supabase.from("profiles").update({ updated_at: new Date().toISOString() }).eq("id", user.id);
    };
    updatePresence();
    const interval = setInterval(updatePresence, 45000);
    return () => clearInterval(interval);
  }, [user, supabase]);

  // Carrega servidores reais
  const syncServers = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", user.id);

    const serverIds = (memberships || []).map((m: any) => m.server_id);

    if (serverIds.length === 0) {
      const { data: newSrv } = await supabase
        .from("servers")
        .insert({
          name: "Meu Servidor Pamplex",
          initials: "MP",
          owner_id: user.id,
        })
        .select()
        .single();

      if (newSrv) {
        await supabase.from("server_members").insert({
          server_id: newSrv.id,
          user_id: user.id,
          role: "owner",
        });

        await supabase.from("channels").insert([
          { server_id: newSrv.id, name: "geral", type: "text", category: "Canais de Texto" },
          { server_id: newSrv.id, name: "Sala de Voz", type: "voice", category: "Canais de Voz" },
        ]);

        serverIds.push(newSrv.id);
      }
    }

    if (serverIds.length === 0) return;

    const { data: dbServers } = await supabase
      .from("servers")
      .select("*, channels(*)")
      .in("id", serverIds)
      .order("created_at", { ascending: true });

    if (dbServers) {
      const formattedServers: PamplexServer[] = dbServers.map((srv: any) => ({
        id: srv.id,
        name: srv.name,
        initials: srv.initials,
        hasActiveVoice: false,
        isSpeakingNow: false,
        activeSpeakersInitials: [],
        channels: (srv.channels || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            category: ch.category || (ch.type === "voice" ? "Canais de Voz" : "Canais de Texto"),
          })),
      }));

      setServers(formattedServers);
      if (!activeServerId && formattedServers.length > 0) {
        setActiveServerId(formattedServers[0].id);
        const firstText = formattedServers[0].channels.find((c) => c.type === "text");
        if (firstText) setActiveChannelId(firstText.id);
      }
    }
  }, [user, supabase, activeServerId]);

  // Carrega mensagens
  const syncMessages = useCallback(async () => {
    if (!user) return;

    const [{ data: dbMessages, error }, { data: allProfiles }] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, display_name, username"),
    ]);

    if (error) return;

    const profileMap = new Map<string, string>();
    (allProfiles || []).forEach((p: any) => {
      profileMap.set(p.id, p.display_name || p.username || "Membro");
    });

    if (dbMessages) {
      const formattedMessages: PamplexMessage[] = dbMessages.map((msg: any) => {
        const authorName = profileMap.get(msg.author_id) || "Membro";
        const words = authorName.trim().split(" ").filter(Boolean);
        const initials =
          words.length >= 2
            ? `${words[0][0]}${words[1][0]}`.toUpperCase()
            : authorName.slice(0, 2).toUpperCase();

        return {
          id: msg.id,
          channelId: msg.channel_id,
          authorId: msg.author_id,
          authorName,
          authorInitials: initials,
          authorColor: "bg-pamplex-turquesa text-pamplex-dark",
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
          reactions: [],
        };
      });
      setMessages(formattedMessages);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!user) return;
    Promise.all([syncFriendsAndProfiles(), syncServers(), syncMessages()]);

    const messagesSub = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newRow = payload.new as any;
          let authorName = "Membro Pamplex";

          if (newRow.author_id === user.id) {
            authorName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Você";
          } else {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", newRow.author_id)
              .single();
            if (senderProfile) {
              authorName = senderProfile.display_name || senderProfile.username || "Membro";
            }
          }

          const words = authorName.trim().split(" ").filter(Boolean);
          const initials =
            words.length >= 2
              ? `${words[0][0]}${words[1][0]}`.toUpperCase()
              : authorName.slice(0, 2).toUpperCase();

          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
            return [
              ...prev,
              {
                id: newRow.id,
                channelId: newRow.channel_id,
                authorId: newRow.author_id,
                authorName,
                authorInitials: initials,
                authorColor: "bg-pamplex-turquesa text-pamplex-dark",
                content: newRow.content,
                timestamp: new Date(newRow.created_at).getTime(),
                reactions: [],
              },
            ];
          });
        }
      )
      .subscribe();

    const serversSub = supabase
      .channel("public:servers_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, () => syncServers())
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members" }, () => syncServers())
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, () => syncServers())
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSub);
      supabase.removeChannel(serversSub);
    };
  }, [user, supabase, syncFriendsAndProfiles, syncServers, syncMessages]);

  const currentUserProfile = useMemo(() => {
    const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Utilizador";
    const username = user?.user_metadata?.username || user?.email?.split("@")[0]?.toLowerCase() || "user";
    const words = displayName.trim().split(" ").filter(Boolean);
    const initials = words.length >= 2 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : displayName.slice(0, 2).toUpperCase();
    return { name: displayName, username, initials };
  }, [user]);

  const activeServer = useMemo(() => {
    if (servers.length === 0) return null;
    return servers.find((s) => s.id === activeServerId) ?? servers[0];
  }, [servers, activeServerId]);

  useEffect(() => {
    if (!activeServer?.id) return;
    supabase
      .from("server_members")
      .select("user_id")
      .eq("server_id", activeServer.id)
      .then(({ data }) => {
        if (data) setActiveServerMemberIds(data.map((r: any) => r.user_id));
      });
  }, [activeServer?.id, supabase]);

  const serverMemberList = useMemo(() => {
    if (!user) return members;
    const meAsMember: PamplexMember = {
      id: user.id,
      name: currentUserProfile.name,
      username: currentUserProfile.username,
      initials: currentUserProfile.initials,
      status: "online",
      role: "Fundador",
      accentColor: "bg-pamplex-turquesa text-pamplex-dark",
      inVoiceChannelId: connectedVoiceChannelId ?? undefined,
      isMuted,
      isSpeaking: !isMuted && Boolean(connectedVoiceChannelId),
    };
    const otherServerMembers = members.filter((m) => activeServerMemberIds.includes(m.id));
    return [meAsMember, ...otherServerMembers];
  }, [user, members, activeServerMemberIds, currentUserProfile, connectedVoiceChannelId, isMuted]);

  const activeChannel = useMemo(() => {
    if (!activeServer || activeServer.channels.length === 0) return null;
    const textChannels = activeServer.channels.filter((c) => c.type === "text");
    return textChannels.find((c) => c.id === activeChannelId) ?? textChannels[0] ?? activeServer.channels[0];
  }, [activeServer, activeChannelId]);

  const activeDmFriend = useMemo(
    () => (activeDmUserId ? members.find((m) => m.id === activeDmUserId) ?? null : null),
    [members, activeDmUserId]
  );

  const dmVirtualChannel: PamplexChannel | null = useMemo(() => {
    if (!activeDmFriend || !user) return null;
    const sharedChannelId = `dm-${[user.id, activeDmFriend.id].sort().join("-")}`;
    return {
      id: sharedChannelId,
      name: activeDmFriend.name,
      type: "text",
      category: `@${activeDmFriend.username}`,
    };
  }, [activeDmFriend, user]);

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
  };

  const handleSelectDmUser = (userId: string) => {
    setIsHomeActive(true);
    setActiveDmUserId(userId);
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    if (!user) return;
    await supabase.from("friendships").update({ status: "accepted" }).eq("user_id", friendId).eq("friend_id", user.id);
    await syncFriendsAndProfiles();
  };

  const handleDeclineFriendRequest = async (friendId: string) => {
    if (!user) return;
    await supabase.from("friendships").delete().or(`and(user_id.eq.${friendId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${friendId})`);
    await syncFriendsAndProfiles();
  };

  const handleSendFriendRequest = (username: string): { ok: boolean; message: string } => {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return { ok: false, message: "Digite um nome de usuário válido." };
    if (clean === currentUserProfile.username.toLowerCase()) return { ok: false, message: "Você não pode adicionar a si mesmo." };

    const existing = members.find((m) => m.username.toLowerCase() === clean);
    if (existing) {
      if (existing.relation === "friend") return { ok: false, message: `@${existing.username} já está na sua lista.` };
      if (existing.relation === "pending_incoming") {
        handleAcceptFriendRequest(existing.id);
        return { ok: true, message: `Pedido de @${existing.username} aceito!` };
      }
      if (user) {
        supabase.from("friendships").insert({ user_id: user.id, friend_id: existing.id, status: "pending" }).then(() => syncFriendsAndProfiles());
      }
      return { ok: true, message: `Pedido enviado para @${existing.username}!` };
    }
    return { ok: false, message: `Utilizador @${clean} não encontrado.` };
  };

  const handleJoinVoiceChannel = (channelId: string) => setConnectedVoiceChannelId(channelId);
  const handleDisconnectVoice = () => setConnectedVoiceChannelId(null);
  const handleToggleMute = () => setIsMuted((prev) => !prev);
  const handleToggleDeafen = () => setIsDeafened((prev) => !prev);

  const handleSendMessage = async (content: string) => {
    if (!currentChatChannel || !user) return;
    const { data, error } = await supabase.from("messages").insert({
      channel_id: String(currentChatChannel.id),
      author_id: user.id,
      content,
    }).select().single();

    if (error) {
      alert(`Erro ao enviar mensagem: ${error.message}`);
      return;
    }

    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [
          ...prev,
          {
            id: data.id,
            channelId: data.channel_id,
            authorId: data.author_id,
            authorName: currentUserProfile.name,
            authorInitials: currentUserProfile.initials,
            authorColor: "bg-pamplex-turquesa text-pamplex-dark",
            content: data.content,
            timestamp: new Date(data.created_at).getTime(),
            reactions: [],
          },
        ];
      });
    }
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
            reactions: nextCount <= 0 ? msg.reactions.filter((r) => r.emoji !== emoji) : msg.reactions.map((r) => r.emoji === emoji ? { ...r, count: nextCount, reacted: !r.reacted } : r),
          };
        }
        return { ...msg, reactions: [...msg.reactions, { emoji, count: 1, reacted: true }] };
      })
    );
  };

  const handleCreateServer = async () => {
    if (!user) return;
    const cleanName = newServerName.trim() || "Nova Comunidade";
    const words = cleanName.split(" ").filter(Boolean);
    const initials = words.length >= 2 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : cleanName.slice(0, 2).toUpperCase();

    const { data: srvData, error: srvError } = await supabase.from("servers").insert({
      name: cleanName,
      initials,
      owner_id: user.id,
    }).select().single();

    if (srvError || !srvData) return;

    await supabase.from("server_members").insert({ server_id: srvData.id, user_id: user.id, role: "owner" });
    const { data: chData } = await supabase.from("channels").insert([
      { server_id: srvData.id, name: "geral", type: "text", category: "Canais de Texto" },
      { server_id: srvData.id, name: "Sala de Voz", type: "voice", category: "Canais de Voz" },
    ]).select();

    await syncServers();
    setIsHomeActive(false);
    setActiveServerId(srvData.id);
    if (chData && chData[0]) setActiveChannelId(chData[0].id);
    setNewServerName("");
    setCreateServerOpen(false);
  };

  const handleJoinServerByInvite = async () => {
    if (!user) return;
    setJoinError(null);
    const raw = joinInviteInput.trim();
    const extractedId = raw.includes("/convite/") ? raw.split("/convite/")[1].split(/[/?#]/)[0] : raw;

    if (!extractedId) {
      setJoinError("Cole um link de convite ou ID válido.");
      return;
    }

    const { data: targetServer, error: findErr } = await supabase.from("servers").select("id").eq("id", extractedId).single();
    if (findErr || !targetServer) {
      setJoinError("Servidor não encontrado.");
      return;
    }

    await supabase.from("server_members").upsert({ server_id: targetServer.id, user_id: user.id, role: "member" }, { onConflict: "server_id,user_id" });
    await syncServers();
    setIsHomeActive(false);
    setActiveServerId(targetServer.id);
    setJoinInviteInput("");
    setCreateServerOpen(false);
  };

  const handleCreateChannel = async () => {
    if (!activeServer || !newChannelName.trim()) return;
    const formattedName = newChannelType === "text" ? newChannelName.trim().toLowerCase().replace(/\s+/g, "-") : newChannelName.trim();

    const { data: createdChannel, error } = await supabase.from("channels").insert({
      server_id: activeServer.id,
      name: formattedName,
      type: newChannelType,
      category: newChannelType === "voice" ? "Canais de Voz" : "Canais de Texto",
    }).select().single();

    if (error || !createdChannel) return;
    await syncServers();
    if (newChannelType === "text") setActiveChannelId(createdChannel.id);
    setNewChannelName("");
    setCreateChannelOpen(false);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://pamplex-lilac.vercel.app";
  const inviteUrl = activeServer ? `${origin}/convite/${activeServer.id}` : "";

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-pamplex-bg text-pamplex-text-primary">
        <p className="text-sm text-pamplex-text-muted">A carregar o Pamplex...</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-pamplex-bg text-pamplex-text-primary">
      {user ? (
        <>
          <ServerRail
            servers={servers}
            activeServerId={activeServer?.id ?? ""}
            isHomeActive={isHomeActive}
            homeBadgeCount={pendingRequestsCount + totalUnreadDms}
            onSelectHome={handleSelectHome}
            onSelectServer={handleSelectServer}
            onOpenCreateServer={() => {
              setServerModalTab("create");
              setJoinError(null);
              setCreateServerOpen(true);
            }}
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
            activeServer &&
            activeChannel && (
              <ChannelSidebar
                server={activeServer}
                activeChannelId={activeChannel.id}
                connectedVoiceChannelId={connectedVoiceChannelId}
                members={serverMemberList}
                onSelectTextChannel={handleSelectTextChannel}
                onJoinVoiceChannel={handleJoinVoiceChannel}
                onOpenInviteModal={() => setInviteModalOpen(true)}
              />
            )
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

          {!isHomeActive && showMembers && <MemberList members={serverMemberList} />}

          <FloatingDock
            currentUser={currentUserProfile}
            connectedChannelName={connectedVoiceInfo?.channelName ?? null}
            connectedServerName={connectedVoiceInfo?.serverName ?? null}
            isMuted={isMuted}
            isDeafened={isDeafened}
            onToggleMute={handleToggleMute}
            onToggleDeafen={handleToggleDeafen}
            onDisconnectVoice={handleDisconnectVoice}
          />

          <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
            {!isHomeActive && activeServer && (
              <button
                type="button"
                onClick={() => setCreateChannelOpen(true)}
                title="Criar Canal neste Servidor"
                className="flex items-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-400/10 px-3 py-1.5 text-xs font-medium text-teal-300 backdrop-blur-md transition hover:bg-teal-400/20 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Canal
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="Terminar Sessão"
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 backdrop-blur-md transition hover:bg-red-500/20 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>

          <Modal
            open={createServerOpen}
            onClose={() => setCreateServerOpen(false)}
            title={serverModalTab === "create" ? "Criar novo servidor" : "Entrar num servidor"}
            description={serverModalTab === "create" ? "Crie um espaço organizado para amigos ou equipa." : "Cole o link de convite ou ID."}
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreateServerOpen(false)}>Cancelar</Button>
                {serverModalTab === "create" ? (
                  <Button variant="primary" onClick={handleCreateServer}><Sparkles className="h-4 w-4" /> Criar Servidor</Button>
                ) : (
                  <Button variant="primary" onClick={handleJoinServerByInvite}><UserPlus className="h-4 w-4" /> Entrar no Servidor</Button>
                )}
              </>
            }
          >
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setServerModalTab("create")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${serverModalTab === "create" ? "bg-teal-400 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}
                >
                  Criar Novo
                </button>
                <button
                  type="button"
                  onClick={() => setServerModalTab("join")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${serverModalTab === "join" ? "bg-teal-400 text-zinc-950 font-semibold" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}
                >
                  Tenho um Convite
                </button>
              </div>

              {serverModalTab === "create" ? (
                <Input
                  label="Nome do servidor"
                  placeholder="Ex: Oficina & Projetos"
                  leftIcon={<Hash className="h-4 w-4" />}
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    label="Link de convite ou ID"
                    placeholder="https://pamplex-lilac.vercel.app/convite/..."
                    value={joinInviteInput}
                    onChange={(e) => setJoinInviteInput(e.target.value)}
                  />
                  {joinError && <p className="text-xs text-red-400">{joinError}</p>}
                </div>
              )}
            </div>
          </Modal>

          <Modal
            open={createChannelOpen}
            onClose={() => setCreateChannelOpen(false)}
            title={`Criar canal em ${activeServer?.name ?? "Servidor"}`}
            description="Escolha o tipo de canal."
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreateChannelOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleCreateChannel}><Plus className="h-4 w-4" /> Criar Canal</Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewChannelType("text")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition cursor-pointer ${newChannelType === "text" ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-zinc-800 bg-zinc-900 text-zinc-400"}`}
                >
                  <Hash className="h-4 w-4" /> Texto
                </button>
                <button
                  type="button"
                  onClick={() => setNewChannelType("voice")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition cursor-pointer ${newChannelType === "voice" ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-zinc-800 bg-zinc-900 text-zinc-400"}`}
                >
                  <Volume2 className="h-4 w-4" /> Voz
                </button>
              </div>
              <Input
                label="Nome do canal"
                placeholder={newChannelType === "text" ? "ex: geral" : "Ex: Conversas"}
                leftIcon={newChannelType === "text" ? <Hash className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
          </Modal>

          {activeServer && (
            <Modal
              open={inviteModalOpen}
              onClose={() => setInviteModalOpen(false)}
              title={`Convidar para ${activeServer.name}`}
              description="Partilhe este link direto."
              footer={<Button variant="secondary" onClick={() => setInviteModalOpen(false)}>Concluir</Button>}
            >
              <div className="flex items-end gap-2">
                <Input label="Link de convite" value={inviteUrl} readOnly />
                <Button variant="primary" onClick={handleCopyInvite}>
                  {copiedInvite ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
                </Button>
              </div>
            </Modal>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Pamplex</h1>
          <p className="text-sm text-pamplex-text-muted mb-6">Faça login para aceder aos seus chats.</p>
          <Button variant="primary" onClick={() => setIsAuthModalOpen(true)}>Entrar / Registar</Button>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => { if (user) setIsAuthModalOpen(false); }} onSuccess={() => setIsAuthModalOpen(false)} />
    </div>
  );
}