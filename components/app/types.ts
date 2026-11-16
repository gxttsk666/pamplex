export type ChannelType = "text" | "voice";

export type UserStatus = "online" | "idle" | "dnd" | "offline";

export type FriendRelation = "friend" | "pending_incoming" | "pending_outgoing" | "blocked";

export interface PamplexChannel {
  id: string;
  name: string;
  type: ChannelType;
  category: string;
  unread?: boolean;
}

export interface PamplexServer {
  id: string;
  name: string;
  initials: string;
  folder?: string;
  hasActiveVoice: boolean;
  isSpeakingNow: boolean;
  activeSpeakersInitials: string[];
  channels: PamplexChannel[];
}

export interface PamplexMember {
  id: string;
  name: string;
  username: string;
  initials: string;
  status: UserStatus;
  role?: string;
  accentColor: string;
  inVoiceChannelId?: string;
  isMuted?: boolean;
  isSpeaking?: boolean;
  relation?: FriendRelation;
  customStatus?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface MessageReplyInfo {
  id: string;
  authorName: string;
  content: string;
}

export interface PamplexMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorRole?: string;
  content: string;
  timestamp: number;
  reactions: MessageReaction[];
  replyTo?: MessageReplyInfo;
  isPinned?: boolean;
}

export const INITIAL_SERVERS: PamplexServer[] = [
  {
    id: "s1",
    name: "Comunidade Pamplex",
    initials: "PX",
    hasActiveVoice: true,
    isSpeakingNow: true,
    activeSpeakersInitials: ["GK", "AB"],
    channels: [
      { id: "c-text-1", name: "boas-vindas", type: "text", category: "Informações" },
      { id: "c-text-2", name: "geral", type: "text", category: "Comunidade", unread: true },
      { id: "c-text-3", name: "projetos-e-ideias", type: "text", category: "Comunidade" },
      { id: "c-voice-1", name: "Sala Principal", type: "voice", category: "Canais de Voz" },
      { id: "c-voice-2", name: "Co-working & Foco", type: "voice", category: "Canais de Voz" },
    ],
  },
  {
    id: "s2",
    name: "Oficina 3D & CAD",
    initials: "3D",
    folder: "Projetos",
    hasActiveVoice: false,
    isSpeakingNow: false,
    activeSpeakersInitials: [],
    channels: [
      { id: "c-3d-1", name: "impressoras-fdm", type: "text", category: "Bancada", unread: true },
      { id: "c-3d-2", name: "filamentos-e-perfis", type: "text", category: "Bancada" },
      { id: "c-3d-v1", name: "Bancada Aberta", type: "voice", category: "Voz" },
    ],
  },
  {
    id: "s3",
    name: "Squad Jogos",
    initials: "SJ",
    folder: "Projetos",
    hasActiveVoice: true,
    isSpeakingNow: false,
    activeSpeakersInitials: ["LM"],
    channels: [
      { id: "c-jg-1", name: "lobby", type: "text", category: "Partidas" },
      { id: "c-jg-v1", name: "Call Ranked", type: "voice", category: "Voz" },
    ],
  },
];

export const INITIAL_MEMBERS: PamplexMember[] = [
  {
    id: "u1",
    name: "Gustavo Kriguer",
    username: "gustavo",
    initials: "GK",
    status: "online",
    role: "Fundador",
    accentColor: "bg-pamplex-turquesa text-pamplex-dark",
    inVoiceChannelId: "c-voice-1",
    isSpeaking: true,
  },
  {
    id: "u2",
    name: "Ana Beatriz",
    username: "anabia",
    initials: "AB",
    status: "online",
    role: "Moderação",
    accentColor: "bg-pamplex-esmeralda text-pamplex-dark",
    inVoiceChannelId: "c-voice-1",
    isSpeaking: false,
    relation: "friend",
    customStatus: "Testando o Design System",
  },
  {
    id: "u3",
    name: "Lucas Mendes",
    username: "lucasm",
    initials: "LM",
    status: "idle",
    accentColor: "bg-pamplex-aqua text-pamplex-dark",
    relation: "friend",
    customStatus: "No lobby aguardando squad",
  },
  {
    id: "u4",
    name: "Mariana Costa",
    username: "maricosta",
    initials: "MC",
    status: "dnd",
    accentColor: "bg-pamplex-menta text-pamplex-dark",
    relation: "friend",
    customStatus: "Focada no código",
  },
  {
    id: "u5",
    name: "Rafael Torres",
    username: "rafatorres",
    initials: "RT",
    status: "offline",
    accentColor: "bg-pamplex-elevated text-pamplex-text-secondary",
    relation: "friend",
  },
  {
    id: "u6",
    name: "Camila Rocha",
    username: "camilarocha",
    initials: "CR",
    status: "online",
    accentColor: "bg-pamplex-turquesa text-pamplex-dark",
    relation: "pending_incoming",
    customStatus: "Quer entrar na comunidade",
  },
];

const NOW = 1763150400000;

export const INITIAL_MESSAGES: PamplexMessage[] = [
  {
    id: "m1",
    channelId: "c-text-2",
    authorId: "u2",
    authorName: "Ana Beatriz",
    authorInitials: "AB",
    authorColor: "bg-pamplex-esmeralda text-pamplex-dark",
    authorRole: "Moderação",
    content: "Bem-vindos ao canal #geral do Pamplex! A interface ficou super leve.",
    timestamp: NOW - 1000 * 60 * 12,
    reactions: [{ emoji: "🚀", count: 3, reacted: true }],
  },
  {
    id: "m2",
    channelId: "c-text-2",
    authorId: "u1",
    authorName: "Gustavo Kriguer",
    authorInitials: "GK",
    authorColor: "bg-pamplex-turquesa text-pamplex-dark",
    authorRole: "Fundador",
    content: "Valeu @anabia! Estamos estruturando cada detalhe do Design System e do Radar Vivo.",
    timestamp: NOW - 1000 * 60 * 4,
    reactions: [{ emoji: "💚", count: 2, reacted: true }],
  },
  {
    id: "m3",
    channelId: "c-text-2",
    authorId: "u1",
    authorName: "Gustavo Kriguer",
    authorInitials: "GK",
    authorColor: "bg-pamplex-turquesa text-pamplex-dark",
    authorRole: "Fundador",
    content: "Repara como mensagens enviadas dentro de 5 minutos ficam agrupadas sem repetir o avatar.",
    timestamp: NOW - 1000 * 60 * 3,
    reactions: [],
  },
  {
    id: "m4",
    channelId: "c-text-1",
    authorId: "u1",
    authorName: "Gustavo Kriguer",
    authorInitials: "GK",
    authorColor: "bg-pamplex-turquesa text-pamplex-dark",
    authorRole: "Fundador",
    content: "Este é o Pamplex — comunicação rápida, organizada e sem poluição visual.",
    timestamp: NOW - 1000 * 60 * 60,
    reactions: [{ emoji: "🔥", count: 5, reacted: true }],
  },
  {
    id: "dm-1",
    channelId: "dm-u2",
    authorId: "u2",
    authorName: "Ana Beatriz",
    authorInitials: "AB",
    authorColor: "bg-pamplex-esmeralda text-pamplex-dark",
    content: "Oi Gustavo! Testei o botão P aqui no canto e ficou muito rápido trocar entre servidor e DM.",
    timestamp: NOW - 1000 * 60 * 8,
    reactions: [{ emoji: "💚", count: 1, reacted: true }],
  },
  {
    id: "dm-2",
    channelId: "dm-u3",
    authorId: "u3",
    authorName: "Lucas Mendes",
    authorInitials: "LM",
    authorColor: "bg-pamplex-aqua text-pamplex-dark",
    content: "Bora puxar uma partida mais tarde na Call Ranked?",
    timestamp: NOW - 1000 * 60 * 25,
    reactions: [],
  },
];