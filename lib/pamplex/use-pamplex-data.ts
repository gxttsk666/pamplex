"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  PamplexMessage,
  PamplexServer,
  PamplexChannel,
} from "@/components/app/types";
import {
  asRow,
  asRows,
  type FriendshipRow,
  type MessageRow,
  type ProfileRow,
  type ServerMemberRow,
  type ServerMembershipRow,
  type ServerRowWithChannels,
} from "@/lib/supabase/rows";
import { PENDING_INVITE_KEY } from "@/lib/pamplex/nav";

const AUTHOR_COLOR = "bg-pamplex-turquesa text-pamplex-dark";
const NO_PROFILES: ProfileRow[] = [];
const NO_FRIENDSHIPS: FriendshipRow[] = [];
const NO_SERVER_MEMBERS: ServerMemberRow[] = [];

export interface ProfileLike {
  id: string;
  display_name: string | null;
  username: string | null;
}

export interface CurrentUserProfile {
  name: string;
  username: string;
  initials: string;
}

interface UsePamplexDataResult {
  supabase: SupabaseClient;
  user: User | null;
  authLoading: boolean;
  profiles: ProfileRow[];
  friendships: FriendshipRow[];
  servers: PamplexServer[];
  serverMemberships: ServerMemberRow[];
  messages: PamplexMessage[];
  onlineIds: Set<string>;
  joinServerById: (
    serverId: string
  ) => Promise<{ ok: true; serverId: string } | { ok: false; message: string }>;
  fetchServerMembers: (serverId: string) => Promise<void>;
  refreshServers: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  appendMessage: (message: PamplexMessage) => void;
  upsertMessage: (row: MessageRow, authorName: string) => void;
  updateMessages: (
    updater: (messages: PamplexMessage[]) => PamplexMessage[]
  ) => void;
  currentUserProfile: CurrentUserProfile;
}

function profileDisplayName(profile: ProfileLike): string {
  return profile.display_name || profile.username || "Membro";
}

function formatServer(row: ServerRowWithChannels): PamplexServer {
  const channels: PamplexChannel[] = (row.channels ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type === "voice" ? "voice" : "text",
      category:
        channel.category ||
        (channel.type === "voice" ? "Canais de Voz" : "Canais de Texto"),
    }));

  return {
    id: row.id,
    name: row.name,
    initials: row.initials || row.name.slice(0, 2).toUpperCase(),
    hasActiveVoice: false,
    isSpeakingNow: false,
    activeSpeakersInitials: [],
    channels,
  };
}

/**
 * Camada única de acesso a dados do Pamplex: sessão, perfis, servidores,
 * mensagens e presença em tempo real. O `page.tsx` só consome este estado.
 */
export function usePamplexData(): UsePamplexDataResult {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>(NO_PROFILES);
  const [friendships, setFriendships] = useState<FriendshipRow[]>(NO_FRIENDSHIPS);
  const [servers, setServers] = useState<PamplexServer[]>([]);
  const [serverMemberships, setServerMemberships] =
    useState<ServerMemberRow[]>(NO_SERVER_MEMBERS);
  const [messages, setMessages] = useState<PamplexMessage[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const creatingDefaultServerRef = useRef(false);

  // 1. Sessão
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const currentUserProfile = useMemo<CurrentUserProfile>(() => {
    const fallback = user?.email?.split("@")[0] ?? "Utilizador";
    const displayName =
      (user?.user_metadata?.display_name as string | undefined) || fallback;
    const username = (
      (user?.user_metadata?.username as string | undefined) || fallback
    ).toLowerCase();
    return {
      name: displayName,
      username,
      initials: displayName.slice(0, 2).toUpperCase(),
    };
  }, [user]);

  // 2. Perfis e amizades
  const refreshProfiles = useCallback(async () => {
    if (!user) return;

    const [profilesResult, friendshipsResult] = await Promise.all([
      supabase.from("profiles").select("id, display_name, username, status"),
      supabase
        .from("friendships")
        .select("id, user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
    ]);

    if (profilesResult.data) {
      setProfiles(asRows<ProfileRow>(profilesResult.data));
    }
    if (friendshipsResult.data) {
      setFriendships(asRows<FriendshipRow>(friendshipsResult.data));
    }
  }, [user, supabase]);

  // 3. Servidores do utilizador (cria um padrão quando não existe nenhum)
  const refreshServers = useCallback(async () => {
    if (!user) return;

    const { data: membershipData } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", user.id);

    const memberships = asRows<ServerMembershipRow>(membershipData);
    const serverIds = memberships
      .map((m) => m.server_id)
      .filter((id): id is string => Boolean(id));

    if (serverIds.length === 0 && !creatingDefaultServerRef.current) {
      creatingDefaultServerRef.current = true;
      try {
        const { data: newServer } = await supabase
          .from("servers")
          .insert({
            name: "Meu Servidor Pamplex",
            initials: "MP",
            owner_id: user.id,
          })
          .select("id")
          .single();

        const created = asRow<{ id: string }>(newServer);

        if (created) {
          await supabase.from("server_members").insert({
            server_id: created.id,
            user_id: user.id,
            role: "owner",
          });

          await supabase.from("channels").insert([
            {
              server_id: created.id,
              name: "geral",
              type: "text",
              category: "Canais de Texto",
            },
            {
              server_id: created.id,
              name: "Sala de Voz",
              type: "voice",
              category: "Canais de Voz",
            },
          ]);

          serverIds.push(created.id);
        }
      } finally {
        creatingDefaultServerRef.current = false;
      }
    }

    if (serverIds.length === 0) return;

    const { data: serverData } = await supabase
      .from("servers")
      .select("id, name, initials, owner_id, created_at, channels(*)")
      .in("id", serverIds)
      .order("created_at", { ascending: true });

    setServers(asRows<ServerRowWithChannels>(serverData).map(formatServer));
  }, [user, supabase]);

  // 4. Mensagens (o RLS filtra o que o utilizador pode ver)
  const refreshMessages = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("id, channel_id, author_id, content, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar mensagens:", error.message);
      return;
    }

    const authorNames = new Map<string, string>();
    profiles.forEach((profile) =>
      authorNames.set(profile.id, profileDisplayName(profile))
    );
    if (!authorNames.has(currentUserProfile.username)) {
      authorNames.set(user.id, currentUserProfile.name);
    }

    setMessages(
      asRows<MessageRow>(data).map((row) => {
        const authorName = authorNames.get(row.author_id) || "Membro";
        return {
          id: row.id,
          channelId: row.channel_id,
          authorId: row.author_id,
          authorName,
          authorInitials: authorName.slice(0, 2).toUpperCase(),
          authorColor: AUTHOR_COLOR,
          content: row.content,
          timestamp: new Date(row.created_at).getTime(),
          reactions: [],
        };
      })
    );
  }, [user, supabase, profiles, currentUserProfile]);

  const fetchServerMembers = useCallback(
    async (serverId: string) => {
      if (!serverId) {
        setServerMemberships(NO_SERVER_MEMBERS);
        return;
      }

      const { data, error } = await supabase
        .from("server_members")
        .select("user_id, role")
        .eq("server_id", serverId);

      if (error) {
        console.error("Erro ao carregar membros do servidor:", error.message);
        return;
      }
      setServerMemberships(asRows<ServerMemberRow>(data));
    },
    [supabase]
  );

  const joinServerById = useCallback(
    async (serverId: string) => {
      const { data, error } = await supabase.rpc("join_server", {
        p_server_id: serverId,
      });

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

  const upsertMessage = useCallback((row: MessageRow, authorName: string) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev;
      return [
        ...prev,
        {
          id: row.id,
          channelId: row.channel_id,
          authorId: row.author_id,
          authorName,
          authorInitials: authorName.slice(0, 2).toUpperCase(),
          authorColor: AUTHOR_COLOR,
          content: row.content,
          timestamp: new Date(row.created_at).getTime(),
          reactions: [],
        },
      ];
    });
  }, []);

  const appendMessage = useCallback((message: PamplexMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
  }, []);

  const updateMessages = useCallback(
    (updater: (messages: PamplexMessage[]) => PamplexMessage[]) => {
      setMessages((prev) => updater(prev));
    },
    []
  );

  // 5. Realtime: mensagens, amizades, canais e membros
  useEffect(() => {
    if (!user) return;

    const messagesChannel = supabase
      .channel(`messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newRow = (payload.new ?? {}) as Record<string, unknown>;
          const authorId = typeof newRow.author_id === "string" ? newRow.author_id : "";
          let authorName = "Membro Pamplex";

          if (authorId === user.id) {
            authorName = currentUserProfile.name;
          } else {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", authorId)
              .maybeSingle();
            const sender = asRows<ProfileLike>(
              senderProfile ? [senderProfile] : []
            )[0];
            if (sender) authorName = profileDisplayName(sender);
          }

          upsertMessage(
            {
              id: String(newRow.id ?? ""),
              channel_id: String(newRow.channel_id ?? ""),
              author_id: authorId,
              content: String(newRow.content ?? ""),
              created_at: String(newRow.created_at ?? new Date().toISOString()),
            },
            authorName
          );
        }
      )
      .subscribe();

    const friendsChannel = supabase
      .channel(`friendships:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          refreshProfiles();
        }
      )
      .subscribe();

    const channelsChannel = supabase
      .channel(`channels:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => {
          refreshServers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(channelsChannel);
    };
  }, [user, supabase, currentUserProfile, upsertMessage, refreshProfiles, refreshServers]);

  // 6. Presença real
  useEffect(() => {
    if (!user) return;

    const presence = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    presence
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(presence.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      presence.untrack();
      supabase.removeChannel(presence);
    };
  }, [user, supabase]);

  // 7. Convite pendente guardado antes do login
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const pending = (() => {
      try {
        const value = window.localStorage.getItem(PENDING_INVITE_KEY);
        if (value) window.localStorage.removeItem(PENDING_INVITE_KEY);
        return value;
      } catch {
        return null;
      }
    })();

    if (!pending) return;

    joinServerById(pending).then((result) => {
      if (cancelled || !result.ok) return;
      refreshServers();
      refreshMessages();
    });

    return () => {
      cancelled = true;
    };
  }, [user, joinServerById, refreshServers, refreshMessages]);

  // 8. Carga inicial e recarga quando o conjunto de dados base muda
  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    refreshServers();
  }, [refreshServers]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  return {
    supabase,
    user,
    authLoading,
    profiles,
    friendships,
    servers,
    serverMemberships: user ? serverMemberships : NO_SERVER_MEMBERS,
    messages,
    onlineIds,
    joinServerById,
    fetchServerMembers,
    refreshServers,
    refreshProfiles,
    appendMessage,
    upsertMessage,
    updateMessages,
    currentUserProfile,
  };
}