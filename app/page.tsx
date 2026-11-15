"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const PRODUCTION_URL = "https://pamplex-lilac.vercel.app";
const NAV_KEY = "pamplex_nav_state";
const PENDING_INVITE_KEY = "pamplex_pending_invite";
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Cast via string: funciona mesmo que o tipo de status não liste "offline" explicitamente.
const ONLINE_STATUS = "online" as string as PamplexMember["status"];
const OFFLINE_STATUS = "offline" as string as PamplexMember["status"];

type ServerMemberRow = { user_id: string; role: string | null };

// Aceita link completo, "/convite/<id>", ou só o ID colado
function extractServerId(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  const uuid = text.match(UUID_REGEX);
  if (uuid) return uuid[0].toLowerCase();
  const afterInvite = text.match(/\/convite\/([^/?#\s]+)/i);
  if (afterInvite) return afterInvite[1];
  return text.split(/[/?#]/).filter(Boolean).pop() ?? "";
}

function toRoleLabel(role?: string | null): string | undefined {
  if (role === "owner") return "Fundador";
  if (role === "admin") return "Admin";
  return undefined;
}

function buildInitials(name: string): string {
  const words = name.trim().split(" ").filter(Boolean);
  return words.length >= 2
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function PamplexApp() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [servers, setServers] = useState<PamplexServer[]>([]);
  const [isHomeActive, setIsHomeActive] = useState<boolean>(false);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null);
  const [navRestored, setNavRestored] = useState<boolean>(false);

  const [members, setMembers] = useState<PamplexMember[]>([]);
  const [activeServerMembers, setActiveServerMembers] = useState<ServerMemberRow[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
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

  const activeServerIdRef = useRef<string>("");
  const creatingDefaultServerRef = useRef<boolean>(false);

  // 0. Recupera e guarda a última posição de navegação no navegador
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(NAV_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (typeof parsed.isHomeActive === "boolean") setIsHomeActive(parsed.isHomeActive);
        if (parsed.activeServerId) setActiveServerId(parsed.activeServerId);
        if (parsed.activeChannelId) setActiveChannelId(parsed.activeChannelId);
        if (parsed.activeDmUserId !== undefined) setActiveDmUserId(parsed.activeDmUserId);
      }
    } catch {
      // Ignora JSON inválido
    }
    setNavRestored(true);
  }, []);

  useEffect(() => {
    if (!navRestored) return;
    try {
      localStorage.setItem(
        NAV_KEY,
        JSON.stringify({
          isHomeActive,
          activeServerId,
          activeChannelId,
          activeDmUserId,
        })
      );
    } catch {
      // Ignora falhas de storage
    }
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

  // Carrega todos os perfis reais e status de amizade do Supabase
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

        const displayName = p.display_name || p.username || "Membro";

        return {
          id: p.id,
          name: displayName,
          username: p.username,
          initials: buildInitials(displayName),
          status: (p.status as PamplexMember["status"]) || ONLINE_STATUS,
          accentColor: "bg-pamplex-turquesa text-pamplex-dark",
          relation,
        };
      });

    setMembers(realMembers);
  }, [user, supabase]);

  // Carrega servidores reais em que o utilizador participa
  const syncServers = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", user.id);

    const serverIds = (memberships || []).map((m: any) => m.server_id);

    // Cria o servidor padrão só se o utilizador não tem nenhum (com trava contra corrida)
    if (serverIds.length === 0 && !creatingDefaultServerRef.current) {
      creatingDefaultServerRef.current = true;
      try {
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
      } finally {
        creatingDefaultServerRef.current = false;
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
          .sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          .map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            category: ch.category || (ch.type === "voice" ? "Canais de Voz" : "Canais de Texto"),
          })),
      }));

      setServers(formattedServers);
    }
  }, [user, supabase]);

  // Carrega mensagens (duas queries separadas, sem join ambíguo; o RLS filtra o que o utilizador pode ver)
  const syncMessages = useCallback(async () => {
    if (!user) return;

    const [{ data: dbMessages, error }, { data: allProfiles }] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("profiles").select("id, display_name, username"),
    ]);

    if (error) {
      console.error("Erro ao carregar mensagens:", error.message);
      return;
    }

    const profileMap = new Map<string, string>();
    (allProfiles || []).forEach((p: any) => {
      profileMap.set(p.id, p.display_name || p.username || "Membro");
    });

    if (dbMessages) {
      const formattedMessages: PamplexMessage[] = dbMessages.map((msg: any) => {
        const authorName = profileMap.get(msg.author_id) || "Membro";

        return {
          id: msg.id,
          channelId: msg.channel_id,
          authorId: msg.author_id,
          authorName,
          authorInitials: buildInitials(authorName),
          authorColor: "bg-pamplex-turquesa text-pamplex-dark",
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
          reactions: [],
        };
      });
      setMessages(formattedMessages);
    }
  }, [user, supabase]);

  // Busca os membros reais do servidor ativo (ignora respostas antigas se o servidor mudou)
  const fetchActiveServerMembers = useCallback(async () => {
    const serverId = activeServerIdRef.current;
    if (!serverId) return;

    const { data, error } = await supabase
      .from("server_members")
      .select("user_id, role")
      .eq("server_id", serverId);

    if (error) {
      console.error("Erro ao carregar membros do servidor:", error.message);
      return;
    }
    if (serverId !== activeServerIdRef.current) return;
    setActiveServerMembers((data as ServerMemberRow[]) ?? []);
  }, [supabase]);

  // Entrar num servidor via função segura do Supabase (valida o servidor e insere o membro)
  const joinServerById = useCallback(
    async (serverId: string) => {
      const { data, error } = await supabase.rpc("join_server", { p_server_id: serverId });

      if (error || !data) {
        if (error) console.error("Erro ao entrar no servidor:", error.message);
        const message = error?.message?.includes("server_not_found")
          ? "Convite inválido ou servidor não encontrado."
          : error?.message?.includes("not_authenticated")
          ? "Faça login para entrar no servidor."
          : "Não foi possível entrar no servidor. Tente novamente.";
        return { ok: false as const, message };
      }

      return { ok: true as const, serverId: String(data) };
    },
    [supabase]
  );

  // 2. Carregamento inicial + Subscrições Realtime
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Convite pendente (utilizador abriu /convite/<id> sem estar logado)
      let invitedServerId: string | null = null;
      try {
        const pending = localStorage.getItem(PENDING_INVITE_KEY);
        if (pending) {
          localStorage.removeItem(PENDING_INVITE_KEY);
          const result = await joinServerById(pending);
          if (result.ok) invitedServerId = result.serverId;
        }
      } catch {
        // ignora
      }

      await Promise.all([syncFriendsAndProfiles(), syncServers(), syncMessages()]);

      if (invitedServerId) {
        setIsHomeActive(false);
        setActiveServerId(invitedServerId);
        setActiveChannelId("");
      }
    };

    load();

    const messagesSub = supabase
      .channel(`messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newRow = payload.new as any;
          let authorName = "Membro Pamplex";

          if (newRow.author_id === user.id) {
            authorName =
              user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Você";
          } else {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", newRow.author_id)
              .maybeSingle();
            if (senderProfile) {
              authorName = senderProfile.display_name || senderProfile.username || "Membro";
            }
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
            return [
              ...prev,
              {
                id: newRow.id,
                channelId: newRow.channel_id,
                authorId: newRow.author_id,
                authorName,
                authorInitials: buildInitials(authorName),
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

    const friendsSub = supabase
      .channel(`friendships:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => syncFriendsAndProfiles()
      )
      .subscribe();

    const channelsSub = supabase
      .channel(`channels:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => syncServers()
      )
      .subscribe();

    const membersSub = supabase
      .channel(`server_members:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members" },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          syncServers();
          fetchActiveServerMembers();
          // Entrei (ou saí) de um servidor: recarrega o histórico de mensagens visível
          if (row?.user_id === user.id) syncMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSub);
      supabase.removeChannel(friendsSub);
      supabase.removeChannel(channelsSub);
      supabase.removeChannel(membersSub);
    };
  }, [
    user,
    supabase,
    syncFriendsAndProfiles,
    syncServers,
    syncMessages,
    fetchActiveServerMembers,
    joinServerById,
  ]);

  // 3. Presença real (Supabase Realtime Presence)
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Ao fechar/recarregar a aba, avisa que saiu (se falhar, o Realtime remove sozinho em segundos)
    const handleBeforeUnload = () => {
      presenceChannel.untrack();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      setOnlineIds(new Set());
    };
  }, [user, supabase]);

  // Membros com status real: online só quem está conectado agora
  const membersWithPresence = useMemo<PamplexMember[]>(
    () =>
      members.map((m) => {
        if (!onlineIds.has(m.id)) return { ...m, status: OFFLINE_STATUS };
        return { ...m, status: m.status === OFFLINE_STATUS ? ONLINE_STATUS : m.status };
      }),
    [members, onlineIds]
  );

  // Só amigos e pedidos pendentes aparecem nas telas de amigos/DM (desconhecidos ficam de fora)
  const relatedMembers = useMemo(
    () => membersWithPresence.filter((m) => m.relation !== undefined),
    [membersWithPresence]
  );

  const currentUserProfile = useMemo(() => {
    const displayName =
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      "Utilizador";
    const username =
      user?.user_metadata?.username ||
      user?.email?.split("@")[0]?.toLowerCase() ||
      "user";

    return { name: displayName, username, initials: buildInitials(displayName) };
  }, [user]);

  const activeServer = useMemo(() => {
    if (servers.length === 0) return null;
    return servers.find((s) => s.id === activeServerId) ?? servers[0];
  }, [servers, activeServerId]);

  // Ao trocar de servidor: limpa a lista antiga e busca os membros do novo
  useEffect(() => {
    activeServerIdRef.current = activeServer?.id ?? "";
    setActiveServerMembers([]);
    if (activeServer?.id) fetchActiveServerMembers();
  }, [activeServer?.id, fetchActiveServerMembers]);

  // Lista completa de membros do servidor ativo (só quem realmente pertence a ele)
  const serverMemberList = useMemo(() => {
    if (!user) return [];

    const roleById = new Map<string, string | null>();
    activeServerMembers.forEach((row) => roleById.set(row.user_id, row.role));

    const meAsMember: PamplexMember = {
      id: user.id,
      name: currentUserProfile.name,
      username: currentUserProfile.username,
      initials: currentUserProfile.initials,
      status: ONLINE_STATUS,
      role: toRoleLabel(roleById.get(user.id)) as PamplexMember["role"],
      accentColor: "bg-pamplex-turquesa text-pamplex-dark",
      inVoiceChannelId: connectedVoiceChannelId ?? undefined,
      isMuted,
      isSpeaking: !isMuted && Boolean(connectedVoiceChannelId),
    };

    const otherServerMembers = membersWithPresence
      .filter((m) => roleById.has(m.id))
      .map((m) => ({
        ...m,
        role: toRoleLabel(roleById.get(m.id)) as PamplexMember["role"],
      }));

    return [meAsMember, ...otherServerMembers];
  }, [
    user,
    membersWithPresence,
    activeServerMembers,
    currentUserProfile,
    connectedVoiceChannelId,
    isMuted,
  ]);

  const activeChannel = useMemo(() => {
    if (!activeServer || activeServer.channels.length === 0) return null;
    const textChannels = activeServer.channels.filter((c) => c.type === "text");
    return (
      textChannels.find((c) => c.id === activeChannelId) ??
      textChannels[0] ??
      activeServer.channels[0]
    );
  }, [activeServer, activeChannelId]);

  const activeDmFriend = useMemo(
    () =>
      activeDmUserId ? membersWithPresence.find((m) => m.id === activeDmUserId) ?? null : null,
    [membersWithPresence, activeDmUserId]
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
    setActiveChannelId(firstText ? firstText.id : "");
  };

  const handleSelectTextChannel = (channelId: string) => {
    setActiveChannelId(channelId);
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

  const handleAcceptFriendRequest = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", friendId)
      .eq("friend_id", user.id);
    await syncFriendsAndProfiles();
  };

  const handleDeclineFriendRequest = async (friendId: string) => {
    if (!user) return;
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(user_id.eq.${friendId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${friendId})`
      );
    await syncFriendsAndProfiles();
  };

  const handleSendFriendRequest = (username: string): { ok: boolean; message: string } => {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      return { ok: false, message: "Digite um nome de usuário válido." };
    }
    if (clean === currentUserProfile.username.toLowerCase()) {
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

      if (user) {
        supabase
          .from("friendships")
          .insert({
            user_id: user.id,
            friend_id: existing.id,
            status: "pending",
          })
          .then(() => syncFriendsAndProfiles());
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === existing.id ? { ...m, relation: "pending_outgoing" } : m))
      );
      return { ok: true, message: `Pedido de amizade enviado para @${existing.username}!` };
    }

    return {
      ok: false,
      message: `Nenhum utilizador encontrado com @${clean}. Peça para ele criar conta no Pamplex primeiro!`,
    };
  };

  const handleJoinVoiceChannel = (channelId: string) => {
    setConnectedVoiceChannelId(channelId);
  };

  const handleDisconnectVoice = () => {
    setConnectedVoiceChannelId(null);
  };

  const handleToggleMute = () => setIsMuted((prev) => !prev);
  const handleToggleDeafen = () => setIsDeafened((prev) => !prev);

  const handleSendMessage = async (content: string) => {
    if (!currentChatChannel || !user) return;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        channel_id: String(currentChatChannel.id),
        author_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao enviar mensagem:", error.message);
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
            authorRole: isHomeActive ? undefined : "Fundador",
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

  // Criar novo servidor e adicionar o criador como membro 'owner'
  const handleCreateServer = async () => {
    if (!user) return;
    const cleanName = newServerName.trim() || "Nova Comunidade";
    const words = cleanName.split(" ").filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();

    const { data: srvData, error: srvError } = await supabase
      .from("servers")
      .insert({
        name: cleanName,
        initials,
        owner_id: user.id,
      })
      .select()
      .single();

    if (srvError || !srvData) {
      console.error("Erro ao criar servidor:", srvError?.message);
      return;
    }

    const { error: memberError } = await supabase.from("server_members").insert({
      server_id: srvData.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("Erro ao adicionar dono ao servidor:", memberError.message);
      return;
    }

    const { data: chData } = await supabase
      .from("channels")
      .insert([
        { server_id: srvData.id, name: "geral", type: "text", category: "Canais de Texto" },
        { server_id: srvData.id, name: "Sala de Voz", type: "voice", category: "Canais de Voz" },
      ])
      .select();

    await syncServers();
    setIsHomeActive(false);
    setActiveServerId(srvData.id);
    const firstText = (chData || []).find((c: any) => c.type === "text");
    setActiveChannelId(firstText ? firstText.id : "");
    setNewServerName("");
    setCreateServerOpen(false);
  };

  // Entrar num servidor existente colando o link de convite ou o ID do servidor
  const handleJoinServerByInvite = async () => {
    if (!user) return;
    setJoinError(null);

    const extractedId = extractServerId(joinInviteInput);

    if (!extractedId) {
      setJoinError("Cole um link de convite ou ID de servidor válido.");
      return;
    }

    const result = await joinServerById(extractedId);

    if (!result.ok) {
      setJoinError(result.message);
      return;
    }

    await Promise.all([syncServers(), syncMessages()]);
    setIsHomeActive(false);
    setActiveServerId(result.serverId);
    setActiveChannelId("");
    setJoinInviteInput("");
    setCreateServerOpen(false);
  };

  // Criar novo canal de texto ou voz dentro do servidor ativo
  const handleCreateChannel = async () => {
    if (!activeServer || !newChannelName.trim()) return;

    const formattedName =
      newChannelType === "text"
        ? newChannelName.trim().toLowerCase().replace(/\s+/g, "-")
        : newChannelName.trim();

    const { data: createdChannel, error } = await supabase
      .from("channels")
      .insert({
        server_id: activeServer.id,
        name: formattedName,
        type: newChannelType,
        category: newChannelType === "voice" ? "Canais de Voz" : "Canais de Texto",
      })
      .select()
      .single();

    if (error || !createdChannel) {
      console.error("Erro ao criar canal:", error?.message);
      alert("Não foi possível criar o canal. Só o dono do servidor pode criar canais.");
      return;
    }

    await syncServers();
    if (newChannelType === "text") {
      setActiveChannelId(createdChannel.id);
    }
    setNewChannelName("");
    setCreateChannelOpen(false);
  };

  // Link de convite: origem atual no cliente; em localhost usa o domínio oficial
  const origin = useMemo(() => {
    if (typeof window === "undefined") return PRODUCTION_URL;
    const { hostname, origin: currentOrigin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return PRODUCTION_URL;
    return currentOrigin || PRODUCTION_URL;
  }, []);

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
              friends={relatedMembers}
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
              members={relatedMembers}
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

          {/* Barra rápida inferior direita: Novo Canal + Sair */}
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

          {/* Modal Criar Servidor OU Entrar por Convite */}
          <Modal
            open={createServerOpen}
            onClose={() => setCreateServerOpen(false)}
            title={serverModalTab === "create" ? "Criar novo servidor" : "Entrar num servidor"}
            description={
              serverModalTab === "create"
                ? "Crie um espaço organizado para amigos, equipa ou comunidade."
                : "Cole o link de convite ou o ID do servidor partilhado com você."
            }
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreateServerOpen(false)}>
                  Cancelar
                </Button>
                {serverModalTab === "create" ? (
                  <Button variant="primary" onClick={handleCreateServer}>
                    <Sparkles className="h-4 w-4" />
                    Criar Servidor
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleJoinServerByInvite}>
                    <UserPlus className="h-4 w-4" />
                    Entrar no Servidor
                  </Button>
                )}
              </>
            }
          >
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setServerModalTab("create")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    serverModalTab === "create"
                      ? "bg-teal-400 text-zinc-950 font-semibold"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  Criar Novo
                </button>
                <button
                  type="button"
                  onClick={() => setServerModalTab("join")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    serverModalTab === "join"
                      ? "bg-teal-400 text-zinc-950 font-semibold"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  Tenho um Convite
                </button>
              </div>

              {serverModalTab === "create" ? (
                <Input
                  label="Nome do servidor"
                  placeholder="Ex: Oficina 3D & Projetos"
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

          {/* Modal Criar Novo Canal */}
          <Modal
            open={createChannelOpen}
            onClose={() => setCreateChannelOpen(false)}
            title={`Criar canal em ${activeServer?.name ?? "Servidor"}`}
            description="Escolha o tipo de canal e um nome para organizar as conversas."
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreateChannelOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleCreateChannel}>
                  <Plus className="h-4 w-4" />
                  Criar Canal
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewChannelType("text")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition cursor-pointer ${
                    newChannelType === "text"
                      ? "border-teal-400 bg-teal-400/10 text-teal-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Hash className="h-4 w-4" />
                  Canal de Texto
                </button>
                <button
                  type="button"
                  onClick={() => setNewChannelType("voice")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition cursor-pointer ${
                    newChannelType === "voice"
                      ? "border-teal-400 bg-teal-400/10 text-teal-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Volume2 className="h-4 w-4" />
                  Sala de Voz
                </button>
              </div>

              <Input
                label="Nome do canal"
                placeholder={newChannelType === "text" ? "ex: avisos-gerais" : "Ex: Squad Gaming"}
                leftIcon={
                  newChannelType === "text" ? (
                    <Hash className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )
                }
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
          </Modal>

          {/* Modal Convidar */}
          {activeServer && (
            <Modal
              open={inviteModalOpen}
              onClose={() => setInviteModalOpen(false)}
              title={`Convidar para ${activeServer.name}`}
              description="Partilhe este link direto para que outros utilizadores entrem no servidor."
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
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao Pamplex</h1>
          <p className="text-sm text-pamplex-text-muted mb-6">
            Faça login ou crie uma conta para aceder aos seus servidores e chats.
          </p>
          <Button variant="primary" onClick={() => setIsAuthModalOpen(true)}>
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