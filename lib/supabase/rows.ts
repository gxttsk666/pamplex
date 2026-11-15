/**
 * Formatos das linhas que o Pamplex lê do Supabase.
 *
 * O projeto não gera tipos a partir do schema (`supabase gen types`), então
 * estes tipos são declarados à mão. Concentrá-los aqui evita `any` espalhado
 * pela aplicação e mantém um único lugar para atualizar quando o schema mudar.
 */

export interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
  status: string | null;
}

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string | null;
}

export interface ServerRow {
  id: string;
  name: string;
  initials: string | null;
  owner_id: string | null;
  created_at: string;
}

export interface ChannelRow {
  id: string;
  server_id: string;
  name: string;
  type: string;
  category: string | null;
  created_at: string;
}

export interface ServerRowWithChannels extends ServerRow {
  channels: ChannelRow[] | null;
}

export interface ServerMemberRow {
  user_id: string;
  role: string | null;
  server_id?: string;
}

export interface ServerMembershipRow {
  server_id: string;
}

export interface MessageRow {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface MessageReactionRow {
  message_id: string;
  user_id: string;
  emoji: string;
}

/** Corpo mínimo de um evento Realtime do Supabase. */
export interface RealtimeRow {
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

export function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRow<T>(value: unknown): T | null {
  return value && typeof value === "object" ? (value as T) : null;
}

export function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}
