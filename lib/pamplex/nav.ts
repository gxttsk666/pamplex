import type { PamplexMember } from "@/components/app/types";

export const PRODUCTION_URL = "https://pamplex-lilac.vercel.app";
export const NAV_KEY = "pamplex_nav_state";
export const PENDING_INVITE_KEY = "pamplex_pending_invite";
export const VOICE_STATE_KEY = "pamplex_voice_state";
export const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const ONLINE_STATUS: PamplexMember["status"] = "online";
export const OFFLINE_STATUS: PamplexMember["status"] = "offline";

export interface NavState {
  isHomeActive: boolean;
  activeServerId: string;
  activeChannelId: string;
  activeDmUserId: string | null;
}

/** Lê a última posição de navegação guardada no browser. */
export function readNavState(): NavState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NAV_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<NavState>;
    return {
      isHomeActive:
        typeof value.isHomeActive === "boolean" ? value.isHomeActive : false,
      activeServerId:
        typeof value.activeServerId === "string" ? value.activeServerId : "",
      activeChannelId:
        typeof value.activeChannelId === "string" ? value.activeChannelId : "",
      activeDmUserId:
        typeof value.activeDmUserId === "string" ? value.activeDmUserId : null,
    };
  } catch {
    return null;
  }
}

export function writeNavState(state: NavState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAV_KEY, JSON.stringify(state));
  } catch {
    // Sem storage disponível: a navegação simplesmente não é restaurada.
  }
}

export interface VoiceState {
  connectedVoiceChannelId: string | null;
  activeCallRoom: string | null;
  isMuted: boolean;
  isDeafened: boolean;
}

export function readVoiceState(): VoiceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(VOICE_STATE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<VoiceState>;
    return {
      connectedVoiceChannelId:
        typeof value.connectedVoiceChannelId === "string"
          ? value.connectedVoiceChannelId
          : null,
      activeCallRoom:
        typeof value.activeCallRoom === "string" ? value.activeCallRoom : null,
      isMuted: typeof value.isMuted === "boolean" ? value.isMuted : false,
      isDeafened: typeof value.isDeafened === "boolean" ? value.isDeafened : false,
    };
  } catch {
    return null;
  }
}

export function writeVoiceState(state: VoiceState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(VOICE_STATE_KEY, JSON.stringify(state));
  } catch {
    // Sem storage disponível.
  }
}

export function clearVoiceState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(VOICE_STATE_KEY);
  } catch {
    // Sem storage disponível.
  }
}

/** Aceita link completo, "/convite/<id>", ou só o ID colado. */
export function extractServerId(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  const uuid = text.match(UUID_REGEX);
  if (uuid) return uuid[0].toLowerCase();
  const afterInvite = text.match(/\/convite\/([^/?#\s]+)/i);
  if (afterInvite) return afterInvite[1];
  return text.split(/[/?#]/).filter(Boolean).pop() ?? "";
}

export function toRoleLabel(role?: string | null): string | undefined {
  if (role === "owner") return "Fundador";
  if (role === "admin") return "Admin";
  return undefined;
}

export function buildInitials(name: string): string {
  const words = name.trim().split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  return words.length >= 2
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export function buildServerInitials(name: string): string {
  const words = name.trim().split(" ").filter(Boolean);
  if (words.length === 0) return "PX";
  return words.length >= 2
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/**
 * Id determinístico de uma conversa 1-a-1: o par de ids ordenado, para que
 * ambos os lados cheguem ao mesmo canal sem precisar de uma tabela extra.
 */
export function dmChannelId(userA: string, userB: string): string {
  return `dm-${[userA, userB].sort().join("-")}`;
}

/** Extrai os dois ids de utilizador de um id de canal de DM. */
export function parseDmChannelId(channelId: string): [string, string] | null {
  if (!channelId.startsWith("dm-")) return null;
  const ids = channelId
    .slice(3)
    .split("-");
  // Cada uuid tem 5 segmentos separados por "-"; dois uuids dão 10 segmentos.
  if (ids.length !== 10) return null;
  return [`${ids.slice(0, 5).join("-")}`, `${ids.slice(5).join("-")}`];
}
