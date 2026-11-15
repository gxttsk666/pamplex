"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  PamplexMessage,
  PamplexServer,
  PamplexChannel,
  MessageReplyInfo,
  MessageReaction,
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
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  currentUserProfile: CurrentUserProfile;
}

function profileDisplayName(profile: ProfileLike): string {
  return profile.display_name || profile.username || "Membro";
}

function parseMessageContentAndReply(rawContent: string): {
  content: string;
  replyTo?: MessageReplyInfo;
} {
  let content = rawContent ?? "";
  let replyTo: MessageReplyInfo | undefined = undefined;

  if (content.startsWith("[reply:")) {
    const closeBracketIdx = content.indexOf("]");
    if (closeBracketIdx !== -1) {
      const header = content.slice(7, closeBracketIdx);
      const parts = header.split(":");
      const replyId = parts[0];
      const replyAuthor = parts[1];
      const replyText = parts.slice(2).join(":");

      replyTo = {
        id: replyId,
        authorName: replyAuthor,
        content: replyText,
      };

      content = content.slice(closeBracketIdx + 1).trim();
    }
  }

  content = content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !(
        trimmed.startsWith("> **@") ||
        trimmed.startsWith("> **") ||
        (trimmed.startsWith(">") && trimmed.includes(":"))
      );
    })
    .join("\n")
    .trim();

  return { content, replyTo };
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

  // Refs para manter dados atualizados sem disparar re-renders no Realtime
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  const userRef = useRef(user);
  userRef.current = user;

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

  const currentUserProfileRef = useRef(currentUserProfile);
  currentUserProfileRef.current = currentUserProfile;

  const refreshProfiles = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const [profilesResult, friendshipsResult] = await Promise.all([
      supabase.from("profiles").select("id, display_name, username, status"),
      supabase
        .from("friendships")
        .select("id, user_id, friend_id, status")
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`),
    ]);

    if (profilesResult.data) {
      setProfiles(asRows<ProfileRow>(profilesResult.data));
    }
    if (friendshipsResult.data) {
      setFriendships(asRows<FriendshipRow>(friendshipsResult.data));
    }
  }, [supabase]);

  const refreshServers = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const { data: membershipData } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", currentUser.id);

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
            owner_id: currentUser.id,
          })
          .select("id")
          .single();

        const created = asRow<{ id: string }>(newServer);

        if (created) {
          await supabase.from("server_members").insert({
            server_id: created.id,
            user_id: currentUser.id,
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
  }, [supabase]);

  // Mensagens e Reações do Supabase
  const refreshMessages = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const [messagesRes, reactionsRes] = await Promise.all([
      supabase
        .from("messages")
        .select("id, channel_id, author_id, content, created_at")
        .order("created_at", { ascending: true }),
      supabase.from("message_reactions").select("message_id, user_id, emoji"),
    ]);

    if (messagesRes.error) {
      console.error("Erro ao carregar mensagens:", messagesRes.error.message);
      return;
    }

    const authorNames = new Map<string, string>();
    profilesRef.current.forEach((profile) =>
      authorNames.set(profile.id, profileDisplayName(profile))
    );
    if (!authorNames.has(currentUserProfileRef.current.username)) {
      authorNames.set(currentUser.id, currentUserProfileRef.current.name);
    }

    const rawReactions = reactionsRes.data ?? [];

    setMessages(
      asRows<MessageRow>(messagesRes.data).map((row) => {
        const authorName = authorNames.get(row.author_id) || "Membro";
        const { content, replyTo } = parseMessageContentAndReply(row.content);

        const msgReactionsMap = new Map<string, { count: number; reacted: boolean }>();
        rawReactions
          .filter((r) => r.message_id === row.id)
          .forEach((r) => {
            const existing = msgReactionsMap.get(r.emoji) || { count: 0, reacted: false };
            msgReactionsMap.set(r.emoji, {
              count: existing.count + 1,
              reacted: existing.reacted || r.user_id === currentUser.id,
            });
          });

        const reactions: MessageReaction[] = Array.from(msgReactionsMap.entries()).map(
          ([emoji, data]) => ({
            emoji,
            count: data.count,
            reacted: data.reacted,
          })
        );

        return {
          id: row.id,
          channelId: row.channel_id,
          authorId: row.author_id,
          authorName,
          authorInitials: authorName.slice(0, 2).toUpperCase(),
          authorColor: AUTHOR_COLOR,
          content,
          timestamp: new Date(row.created_at).getTime(),
          reactions,
          replyTo,
        };
      })
    );
  }, [supabase]);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = [...msg.reactions];
          const idx = reactions.findIndex((r) => r.emoji === emoji);
          const isReacted = reactions[idx]?.reacted ?? false;

          if (isReacted) {
            if (idx !== -1) {
              if (reactions[idx].count <= 1) {
                reactions.splice(idx, 1);
              } else {
                reactions[idx] = {
                  ...reactions[idx],
                  count: reactions[idx].count - 1,
                  reacted: false,
                };
              }
            }
          } else {
            if (idx !== -1) {
              reactions[idx] = {
                ...reactions[idx],
                count: reactions[idx].count + 1,
                reacted: true,
              };
            } else {
              reactions.push({ emoji, count: 1, reacted: true });
            }
          }
          return { ...msg, reactions };
        })
      );

      const currentMsg = messages.find((m) => m.id === messageId);
      const existingReaction = currentMsg?.reactions.find((r) => r.emoji === emoji);
      const isReacted = existingReaction?.reacted ?? false;

      if (isReacted) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", currentUser.id)
          .eq("emoji", emoji);
      } else {
        await supabase.from("message_reactions").upsert(
          { message_id: messageId, user_id: currentUser.id, emoji },
          { onConflict: "message_id,user_id,emoji" }
        );
      }
    },
    [user, messages, supabase]
  );

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
      const { content, replyTo } = parseMessageContentAndReply(row.content);
      const exists = prev.some((m) => m.id === row.id);
      if (exists) {
        return prev.map((m) =>
          m.id === row.id ? { ...m, content, replyTo } : m
        );
      }
      return [
        ...prev,
        {
          id: row.id,
          channelId: row.channel_id,
          authorId: row.author_id,
          authorName,
          authorInitials: authorName.slice(0, 2).toUpperCase(),
          authorColor: AUTHOR_COLOR,
          content,
          timestamp: new Date(row.created_at).getTime(),
          reactions: [],
          replyTo,
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

  // Realtime global e estável
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("pamplex-global-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newRow = (payload.new ?? {}) as Record<string, unknown>;
          const authorId =
            typeof newRow.author_id === "string" ? newRow.author_id : "";
          let authorName = "Membro Pamplex";

          if (authorId === user.id) {
            authorName = currentUserProfileRef.current.name;
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = (payload.new ?? {}) as Record<string, unknown>;
          const id = String(updated.id ?? "");
          const rawContent = String(updated.content ?? "");
          if (!id) return;
          const { content, replyTo } = parseMessageContentAndReply(rawContent);
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content, replyTo } : m))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const deleted = (payload.old ?? {}) as Record<string, unknown>;
          const id = String(deleted.id ?? "");
          if (!id) return;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          refreshMessages();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          refreshProfiles();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => {
          refreshServers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, upsertMessage, refreshMessages, refreshProfiles, refreshServers]);

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
    toggleReaction,
    currentUserProfile,
  };
}