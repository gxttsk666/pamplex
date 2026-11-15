"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Plus, UserPlus } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { ServerRail } from "@/components/app/ServerRail";
import { ChannelSidebar } from "@/components/app/ChannelSidebar";
import { DirectSidebar, type DmPreview } from "@/components/app/DirectSidebar";
import { FriendsView } from "@/components/app/FriendsView";
import { ChatArea } from "@/components/app/ChatArea";
import { MemberList } from "@/components/app/MemberList";
import { FloatingDock } from "@/components/app/FloatingDock";
import { ChannelModal, InviteModal, ServerModal } from "@/components/app/PamplexModals";
import type {
  PamplexChannel,
  PamplexMember,
  PamplexMessage,
  PamplexServer,
} from "@/components/app/types";
import { Button } from "@/components/ui/Button";
import { usePamplexData } from "@/lib/pamplex/use-pamplex-data";
import {
  OFFLINE_STATUS,
  ONLINE_STATUS,
  PRODUCTION_URL,
  buildInitials,
  buildServerInitials,
  dmChannelId,
  extractServerId,
  parseDmChannelId,
  readNavState,
  toRoleLabel,
  writeNavState,
} from "@/lib/pamplex/nav";

type ServerModalTab = "create" | "join";

const AUTHOR_COLOR = "bg-pamplex-turquesa text-pamplex-dark";
const IMAGE_URL_REGEX = /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?/i;

function getLastReadStorageKey(userId: string) {
  return `pamplex_dm_last_read_${userId}`;
}

function readLastReadMap(userId: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(getLastReadStorageKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeLastReadMap(userId: string, map: Record<string, number>) {
  try {
    window.localStorage.setItem(getLastReadStorageKey(userId), JSON.stringify(map));
  } catch {
    // Ignora
  }
}

function playNotificationTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignora
  }
}

export default function PamplexApp() {
  const {
    supabase,
    user,
    authLoading,
    profiles,
    friendships,
    servers,
    serverMemberships,
    messages,
    onlineIds,
    joinServerById,
    fetchServerMembers,
    refreshServers,
    refreshProfiles,
    updateMessages,
    currentUserProfile,
  } = usePamplexData();

  // Navegação
  const [isHomeActive, setIsHomeActive] = useState(false);
  const [activeServerId, setActiveServerId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState("");
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [navRestored, setNavRestored] = useState(false);

  // UI
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverModalTab, setServerModalTab] = useState<ServerModalTab>("create");
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Áudio
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Persistência de leitura por DM
  const [lastReadByUserId, setLastReadByUserId] = useState<Record<string, number>>({});
  const [lastReadLoaded, setLastReadLoaded] = useState(false);

  // Indicador "está digitando..."
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  useEffect(() => {
    const saved = readNavState();
    if (saved) {
      setIsHomeActive(saved.isHomeActive);
      if (saved.activeServerId) setActiveServerId(saved.activeServerId);
      if (saved.activeChannelId) setActiveChannelId(saved.activeChannelId);
      if (saved.activeDmUserId) setActiveDmUserId(saved.activeDmUserId);
    }
    setNavRestored(true);
  }, []);

  useEffect(() => {
    if (!navRestored) return;
    writeNavState({
      isHomeActive,
      activeServerId,
      activeChannelId,
      activeDmUserId,
    });
  }, [navRestored, isHomeActive, activeServerId, activeChannelId, activeDmUserId]);

  useEffect(() => {
    if (!user) {
      setLastReadByUserId({});
      setLastReadLoaded(false);
      return;
    }
    setLastReadByUserId(readLastReadMap(user.id));
    setLastReadLoaded(true);
  }, [user]);

  const markDmAsRead = useCallback(
    (otherUserId: string, timestamp = Date.now()) => {
      if (!user) return;
      setLastReadByUserId((prev) => {
        if ((prev[otherUserId] ?? 0) >= timestamp) return prev;
        const next = { ...prev, [otherUserId]: timestamp };
        writeLastReadMap(user.id, next);
        return next;
      });
    },
    [user]
  );

  useEffect(() => {
    if (authLoading) return;
    setIsAuthModalOpen(!user);
  }, [authLoading, user]);

  useEffect(() => {
    if (activeServerId) fetchServerMembers(activeServerId);
  }, [activeServerId, fetchServerMembers, serverMemberships.length]);

  const members = useMemo<PamplexMember[]>(() => {
    if (!user) return [];

    const relationByUserId = new Map<string, PamplexMember["relation"]>();
    friendships.forEach((row) => {
      const otherId = row.user_id === user.id ? row.friend_id : row.user_id;
      if (row.status === "accepted") {
        relationByUserId.set(otherId, "friend");
      } else if (row.user_id === user.id) {
        relationByUserId.set(otherId, "pending_outgoing");
      } else {
        relationByUserId.set(otherId, "pending_incoming");
      }
    });

    return profiles
      .filter((profile) => profile.id !== user.id)
      .map((profile) => {
        const displayName = profile.display_name || profile.username || "Membro";
        const storedStatus = profile.status;
        const status: PamplexMember["status"] = !onlineIds.has(profile.id)
          ? OFFLINE_STATUS
          : storedStatus === "idle" || storedStatus === "dnd"
            ? storedStatus
            : ONLINE_STATUS;

        return {
          id: profile.id,
          name: displayName,
          username: profile.username ?? displayName,
          initials: buildInitials(displayName),
          status,
          accentColor: AUTHOR_COLOR,
          relation: relationByUserId.get(profile.id),
        };
      });
  }, [user, profiles, friendships, onlineIds]);

  const relatedMembers = useMemo(
    () => members.filter((member) => member.relation !== undefined),
    [members]
  );

  const memberById = useMemo(() => {
    const map = new Map<string, PamplexMember>();
    members.forEach((member) => map.set(member.id, member));
    return map;
  }, [members]);

  const lastDmByUserId = useMemo<Record<string, DmPreview>>(() => {
    if (!user) return {};
    const result: Record<string, DmPreview> = {};

    for (const msg of messages) {
      const pair = parseDmChannelId(msg.channelId);
      if (!pair) continue;
      const otherId =
        pair[0] === user.id ? pair[1] : pair[1] === user.id ? pair[0] : null;
      if (!otherId) continue;

      const existing = result[otherId];
      if (!existing || msg.timestamp >= existing.timestamp) {
        const isImage = IMAGE_URL_REGEX.test(msg.content);
        const cleanText = msg.content.replace(IMAGE_URL_REGEX, "").trim();
        const previewText = cleanText
          ? `${msg.authorId === user.id ? "Você: " : ""}${cleanText}`
          : isImage
            ? `${msg.authorId === user.id ? "Você enviou " : ""}📷 Imagem`
            : msg.content;

        result[otherId] = {
          text: previewText,
          timestamp: msg.timestamp,
        };
      }
    }

    return result;
  }, [messages, user]);

  const activeServer = useMemo<PamplexServer | null>(() => {
    if (servers.length === 0) return null;
    return servers.find((server) => server.id === activeServerId) ?? servers[0];
  }, [servers, activeServerId]);

  const activeChannel = useMemo<PamplexChannel | null>(() => {
    if (!activeServer || activeServer.channels.length === 0) return null;
    const textChannels = activeServer.channels.filter((c) => c.type === "text");
    return (
      textChannels.find((c) => c.id === activeChannelId) ??
      textChannels[0] ??
      activeServer.channels[0]
    );
  }, [activeServer, activeChannelId]);

  const activeDmFriend = useMemo(
    () => (activeDmUserId ? memberById.get(activeDmUserId) ?? null : null),
    [memberById, activeDmUserId]
  );

  const dmVirtualChannel = useMemo<PamplexChannel | null>(() => {
    if (!activeDmFriend || !user) return null;
    return {
      id: dmChannelId(user.id, activeDmFriend.id),
      name: activeDmFriend.name,
      type: "text",
      category: `@${activeDmFriend.username}`,
    };
  }, [activeDmFriend, user]);

  const currentChatChannel = isHomeActive ? dmVirtualChannel : activeChannel;

  const channelMessages = useMemo(() => {
    if (!currentChatChannel) return [];
    return messages.filter((message) => message.channelId === currentChatChannel.id);
  }, [messages, currentChatChannel]);

  const serverMemberList = useMemo<PamplexMember[]>(() => {
    if (!user) return [];

    const roleById = new Map<string, string | null>();
    serverMemberships.forEach((row) => roleById.set(row.user_id, row.role));

    const me: PamplexMember = {
      id: user.id,
      name: currentUserProfile.name,
      username: currentUserProfile.username,
      initials: currentUserProfile.initials,
      status: ONLINE_STATUS,
      role: toRoleLabel(roleById.get(user.id)),
      accentColor: AUTHOR_COLOR,
      inVoiceChannelId: connectedVoiceChannelId ?? undefined,
      isMuted,
      isSpeaking: !isMuted && !isDeafened && Boolean(connectedVoiceChannelId),
    };

    const others = members
      .filter((member) => roleById.has(member.id))
      .map((member) => ({ ...member, role: toRoleLabel(roleById.get(member.id)) }));

    return [me, ...others];
  }, [
    user,
    members,
    serverMemberships,
    currentUserProfile,
    connectedVoiceChannelId,
    isMuted,
    isDeafened,
  ]);

  const pendingRequestsCount = useMemo(
    () => members.filter((member) => member.relation === "pending_incoming").length,
    [members]
  );

  const unreadByUserId = useMemo<Record<string, number>>(() => {
    if (!user || !lastReadLoaded) return {};
    const counts: Record<string, number> = {};

    for (const msg of messages) {
      if (msg.authorId === user.id) continue;
      const pair = parseDmChannelId(msg.channelId);
      if (!pair) continue;

      const otherId =
        pair[0] === user.id ? pair[1] : pair[1] === user.id ? pair[0] : null;
      if (!otherId) continue;

      if (isHomeActive && activeDmUserId === otherId) continue;

      const lastRead = lastReadByUserId[otherId] ?? 0;
      if (msg.timestamp > lastRead) {
        counts[otherId] = (counts[otherId] ?? 0) + 1;
      }
    }

    return counts;
  }, [user, lastReadLoaded, messages, isHomeActive, activeDmUserId, lastReadByUserId]);

  const totalUnreadDms = useMemo(
    () => Object.values(unreadByUserId).reduce((total, count) => total + count, 0),
    [unreadByUserId]
  );

  useEffect(() => {
    if (!user || !lastReadLoaded || !isHomeActive || !activeDmUserId) return;
    const latestInDm = channelMessages[channelMessages.length - 1]?.timestamp ?? Date.now();
    markDmAsRead(activeDmUserId, Math.max(latestInDm, Date.now()));
  }, [user, lastReadLoaded, isHomeActive, activeDmUserId, channelMessages, markDmAsRead]);

  const connectedVoiceInfo = useMemo(() => {
    if (!connectedVoiceChannelId) return null;
    for (const server of servers) {
      const channel = server.channels.find((c) => c.id === connectedVoiceChannelId);
      if (channel) return { serverName: server.name, channelName: channel.name };
    }
    return null;
  }, [servers, connectedVoiceChannelId]);

  useEffect(() => {
    setTypingUsers([]);
    if (!user || !currentChatChannel) return;

    const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
    const channel = supabase.channel(`typing:${currentChatChannel.id}`);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const senderId = String(payload?.userId ?? "");
        const senderName = String(payload?.name ?? "");
        if (!senderId || senderId === user.id || !senderName) return;

        setTypingUsers((prev) =>
          prev.includes(senderName) ? prev : [...prev, senderName]
        );

        const existingTimer = timeouts.get(senderName);
        if (existingTimer) clearTimeout(existingTimer);
        timeouts.set(
          senderName,
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((n) => n !== senderName));
            timeouts.delete(senderName);
          }, 3000)
        );
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      timeouts.forEach((timer) => clearTimeout(timer));
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [user, currentChatChannel, supabase]);

  const handleTyping = useCallback(() => {
    if (!user || !typingChannelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1800) return;
    lastTypingSentRef.current = now;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, name: currentUserProfile.name },
    });
  }, [user, currentUserProfile.name]);

  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMessagesLoadedRef = useRef(false);

  useEffect(() => {
    if (!user || messages.length === 0) return;

    const isInitial = !initialMessagesLoadedRef.current;
    for (const message of messages) {
      if (seenMessageIdsRef.current.has(message.id)) continue;
      seenMessageIdsRef.current.add(message.id);

      if (!isInitial && message.authorId !== user.id) {
        const isCurrentChannelOpen =
          document.visibilityState === "visible" &&
          currentChatChannel?.id === message.channelId;
        if (!isCurrentChannelOpen) {
          playNotificationTone();
        }
      }
    }
    initialMessagesLoadedRef.current = true;
  }, [messages, user, currentChatChannel?.id]);

  const openDm = useCallback(
    (userId: string) => {
      setIsHomeActive(true);
      setActiveDmUserId(userId);
      markDmAsRead(userId, Date.now());
    },
    [markDmAsRead]
  );

  const handleSelectServer = (serverId: string) => {
    setIsHomeActive(false);
    setActiveServerId(serverId);
    const target = servers.find((server) => server.id === serverId);
    const firstText = target?.channels.find((c) => c.type === "text");
    setActiveChannelId(firstText ? firstText.id : "");
  };

  const acceptFriendRequest = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", friendId)
      .eq("friend_id", user.id);
    await refreshProfiles();
  };

  const declineFriendRequest = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(user_id.eq.${friendId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${friendId})`
      );
    await refreshProfiles();
  };

  const sendFriendRequest = (username: string): { ok: boolean; message: string } => {
    if (!user) return { ok: false, message: "Faça login para adicionar amigos." };

    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return { ok: false, message: "Digite um nome de usuário válido." };
    if (clean === currentUserProfile.username.toLowerCase()) {
      return { ok: false, message: "Você não pode adicionar a si mesmo." };
    }

    const existing = members.find(
      (member) => member.username.toLowerCase() === clean
    );

    if (!existing) {
      return {
        ok: false,
        message: `Nenhum utilizador encontrado com @${clean}.`,
      };
    }

    if (existing.relation === "friend") {
      return { ok: false, message: `@${existing.username} já está na sua lista de amigos.` };
    }
    if (existing.relation === "pending_incoming") {
      acceptFriendRequest(existing.id);
      return { ok: true, message: `Pedido de @${existing.username} aceito automaticamente!` };
    }
    if (existing.relation === "pending_outgoing") {
      return { ok: false, message: `Já existe um pedido pendente para @${existing.username}.` };
    }

    supabase
      .from("friendships")
      .insert({ user_id: user.id, friend_id: existing.id, status: "pending" })
      .then(() => refreshProfiles());

    return { ok: true, message: `Pedido de amizade enviado para @${existing.username}!` };
  };

  const handleSendMessage = async (
    content: string,
    imageFile?: File | null,
    replyTo?: PamplexMessage | null
  ) => {
    if (!currentChatChannel || !user) return;

    let finalContent = content.trim();

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "png";
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, imageFile, { contentType: imageFile.type });

      if (uploadError) {
        console.error("Erro ao enviar imagem:", uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;
      finalContent = finalContent ? `${finalContent}\n${imageUrl}` : imageUrl;
    }

    if (!finalContent) return;

    // Removemos a duplicação de nome no payload: agora gravamos apenas o conteúdo limpo da mensagem respondida
    const payloadContent = replyTo
      ? `[reply:${replyTo.id}:${replyTo.authorName}:${replyTo.content.replace(/\n/g, " ")}]${finalContent}`
      : finalContent;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id: currentChatChannel.id,
        author_id: user.id,
        content: payloadContent,
      })
      .select("id, channel_id, author_id, content, created_at")
      .single();

    if (error) {
      console.error("Erro ao enviar mensagem:", error.message);
      return;
    }

    if (data) {
      const row = data as {
        id: string;
        channel_id: string;
        author_id: string;
        content: string;
        created_at: string;
      };

      let extractedReply = replyTo
        ? {
            id: replyTo.id,
            authorName: replyTo.authorName,
            content: replyTo.content,
          }
        : undefined;

      updateMessages((prev) =>
        prev.some((m) => m.id === row.id)
          ? prev
          : [
              ...prev,
              {
                id: row.id,
                channelId: row.channel_id,
                authorId: row.author_id,
                authorName: currentUserProfile.name,
                authorInitials: currentUserProfile.initials,
                authorColor: AUTHOR_COLOR,
                content: row.content,
                timestamp: new Date(row.created_at).getTime(),
                reactions: [],
                replyTo: extractedReply,
              },
            ]
      );
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("messages")
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("author_id", user.id);

    if (error) {
      console.error("Erro ao editar mensagem:", error.message);
      return;
    }

    updateMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
    );
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("author_id", user.id);

    if (error) {
      console.error("Erro ao apagar mensagem:", error.message);
      return;
    }

    updateMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    updateMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) return message;
        const existing = message.reactions.find((r) => r.emoji === emoji);

        if (!existing) {
          return {
            ...message,
            reactions: [...message.reactions, { emoji, count: 1, reacted: true }],
          };
        }

        const nextCount = existing.reacted ? existing.count - 1 : existing.count + 1;
        if (nextCount <= 0) {
          return {
            ...message,
            reactions: message.reactions.filter((r) => r.emoji !== emoji),
          };
        }
        return {
          ...message,
          reactions: message.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: nextCount, reacted: !r.reacted } : r
          ),
        };
      })
    );
  };

  const handleCreateServer = async (name: string) => {
    if (!user) return;

    const cleanName = name.trim() || "Nova Comunidade";

    const { data: serverData, error: serverError } = await supabase
      .from("servers")
      .insert({
        name: cleanName,
        initials: buildServerInitials(cleanName),
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (serverError || !serverData) {
      console.error("Erro ao criar servidor:", serverError?.message);
      return;
    }

    const newServerId = (serverData as { id: string }).id;

    const { error: memberError } = await supabase.from("server_members").insert({
      server_id: newServerId,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("Erro ao adicionar dono ao servidor:", memberError.message);
      return;
    }

    const { data: createdChannels } = await supabase
      .from("channels")
      .insert([
        { server_id: newServerId, name: "geral", type: "text", category: "Canais de Texto" },
        { server_id: newServerId, name: "Sala de Voz", type: "voice", category: "Canais de Voz" },
      ])
      .select("id, type");

    await refreshServers();
    setIsHomeActive(false);
    setActiveServerId(newServerId);

    const firstText = (createdChannels ?? []).find(
      (channel) => (channel as { type: string }).type === "text"
    ) as { id: string } | undefined;
    setActiveChannelId(firstText ? firstText.id : "");
  };

  const handleJoinServer = async (invite: string): Promise<string | null> => {
    if (!user) return "Faça login para entrar no servidor.";

    const serverId = extractServerId(invite);
    if (!serverId) return "Cole um link de convite ou ID de servidor válido.";

    const result = await joinServerById(serverId);
    if (!result.ok) return result.message;

    await refreshServers();
    setIsHomeActive(false);
    setActiveServerId(result.serverId);
    setActiveChannelId("");
    return null;
  };

  const handleCreateChannel = async (
    name: string,
    type: "text" | "voice"
  ): Promise<{ ok: boolean; message?: string }> => {
    if (!activeServer) return { ok: false, message: "Nenhum servidor ativo." };

    const formattedName =
      type === "text"
        ? name.trim().toLowerCase().replace(/\s+/g, "-")
        : name.trim();

    const { data, error } = await supabase
      .from("channels")
      .insert({
        server_id: activeServer.id,
        name: formattedName,
        type,
        category: type === "voice" ? "Canais de Voz" : "Canais de Texto",
      })
      .select("id, type")
      .single();

    if (error || !data) {
      console.error("Erro ao criar canal:", error?.message);
      return {
        ok: false,
        message: "Não foi possível criar o canal. Só o dono do servidor pode criar canais.",
      };
    }

    await refreshServers();
    if (type === "text") setActiveChannelId((data as { id: string }).id);
    return { ok: true };
  };

  const inviteUrl = activeServer ? `${PRODUCTION_URL}/convite/${activeServer.id}` : "";

  const handleJoinVoiceChannel = (channelId: string) => {
    setConnectedVoiceChannelId(channelId);
    setIsDeafened(false);
  };

  const handleDisconnectVoice = () => {
    setConnectedVoiceChannelId(null);
    setIsMuted(false);
    setIsDeafened(false);
  };

  const handleToggleDeafen = () => {
    setIsDeafened((prev) => {
      const next = !prev;
      setIsMuted(next ? true : isMuted);
      return next;
    });
  };

  const handleLogout = async () => {
    seenMessageIdsRef.current.clear();
    initialMessagesLoadedRef.current = false;
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
            onSelectHome={() => setIsHomeActive(true)}
            onSelectServer={handleSelectServer}
            onOpenCreateServer={() => {
              setServerModalTab("create");
              setServerModalOpen(true);
            }}
          />

          {isHomeActive ? (
            <DirectSidebar
              friends={relatedMembers}
              activeDmUserId={activeDmUserId}
              pendingCount={pendingRequestsCount}
              unreadByUserId={unreadByUserId}
              lastDmByUserId={lastDmByUserId}
              onSelectFriendsTab={() => setActiveDmUserId(null)}
              onSelectDmUser={openDm}
            />
          ) : (
            activeServer &&
            activeChannel && (
              <ChannelSidebar
                server={activeServer}
                activeChannelId={activeChannel.id}
                connectedVoiceChannelId={connectedVoiceChannelId}
                members={serverMemberList}
                onSelectTextChannel={setActiveChannelId}
                onJoinVoiceChannel={handleJoinVoiceChannel}
                onOpenInviteModal={() => setInviteModalOpen(true)}
              />
            )
          )}

          {isHomeActive && !currentChatChannel ? (
            <FriendsView
              members={relatedMembers}
              onStartDm={openDm}
              onAcceptRequest={acceptFriendRequest}
              onDeclineRequest={declineFriendRequest}
              onSendFriendRequest={sendFriendRequest}
            />
          ) : (
            currentChatChannel && (
              <ChatArea
                channel={currentChatChannel}
                messages={channelMessages}
                currentUserId={user.id}
                currentUserUsername={currentUserProfile.username}
                typingUsers={typingUsers}
                showMembers={!isHomeActive && showMembers}
                onToggleMembers={() => setShowMembers((prev) => !prev)}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleReaction={handleToggleReaction}
                onTyping={handleTyping}
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
            onToggleMute={() => setIsMuted((prev) => !prev)}
            onToggleDeafen={handleToggleDeafen}
            onDisconnectVoice={handleDisconnectVoice}
          />

          <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
            {!isHomeActive && activeServer && (
              <button
                type="button"
                onClick={() => setChannelModalOpen(true)}
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

          <ServerModal
            open={serverModalOpen}
            initialTab={serverModalTab}
            onClose={() => setServerModalOpen(false)}
            onCreate={handleCreateServer}
            onJoin={handleJoinServer}
          />

          <ChannelModal
            open={channelModalOpen}
            serverName={activeServer?.name ?? ""}
            onClose={() => setChannelModalOpen(false)}
            onCreate={handleCreateChannel}
          />

          {activeServer && (
            <InviteModal
              open={inviteModalOpen}
              serverName={activeServer.name}
              inviteUrl={inviteUrl}
              onClose={() => setInviteModalOpen(false)}
            />
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Pamplex</h1>
          <p className="text-sm text-pamplex-text-muted mb-6">
            Faça login ou crie uma conta para aceder aos seus servidores e chats.
          </p>
          <Button variant="primary" onClick={() => setIsAuthModalOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Entrar / Registar
          </Button>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (user) setIsAuthModalOpen(false);
        }}
        onSuccess={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}