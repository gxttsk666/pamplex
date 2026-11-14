export type UserStatus = "online" | "idle" | "dnd" | "offline";

export interface PamplexMember {
  id: string;
  name: string;
  username: string;
  initials: string;
  accentColor: string;
  status: UserStatus;
  role?: string;
  roleVariant?: "turquesa" | "esmeralda" | "floresta" | "neutral";
  inVoiceChannelId?: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export interface PamplexChannel {
  id: string;
  name: string;
  type: "text" | "voice";
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

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
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
}

export const INITIAL_MEMBERS: PamplexMember[] = [
  {
    id: "u1",
    name: "Gustavo Kriguer",
    username: "gustavo",
    initials: "GK",
    accentColor: "bg-pamplex-turquesa text-pamplex-dark",
    status: "online",
    role: "Fundador",
    roleVariant: "turquesa",
    inVoiceChannelId: "c-voice-1",
    isSpeaking: true,
  },
  {
    id: "u2",
    name: "Ana Beatriz",
    username: "anabia",
    initials: "AB",
    accentColor: "bg-pamplex-esmeralda text-pamplex-dark",
    status: "online",
    role: "Moderação",
    roleVariant: "floresta",
    inVoiceChannelId: "c-voice-1",
    isSpeaking: false,
  },
  {
    id: "u3",
    name: "Lucas Mendes",
    username: "lucasm",
    initials: "LM",
    accentColor: "bg-pamplex-elevated text-pamplex-aqua",
    status: "idle",
  },
  {
    id: "u4",
    name: "Mariana Costa",
    username: "maricosta",
    initials: "MC",
    accentColor: "bg-pamplex-elevated text-pamplex-menta",
    status: "online",
  },
  {
    id: "u5",
    name: "Rafael Torres",
    username: "rafael",
    initials: "RT",
    accentColor: "bg-pamplex-elevated text-pamplex-text-secondary",
    status: "offline",
  },
];

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
    name: "Oficina 3D & Maker",
    initials: "3D",
    folder: "Projetos",
    hasActiveVoice: false,
    isSpeakingNow: false,
    activeSpeakersInitials: [],
    channels: [
      { id: "c-3d-1", name: "impressões", type: "text", category: "Bancada" },
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
    authorName: "Gustavo",
    authorInitials: "GK",
    authorColor: "bg-pamplex-turquesa text-pamplex-dark",
    authorRole: "Fundador",
    content: "Valeu @anabia! Estamos estruturando cada detalhe do Design System e do Radar Vivo.",
    timestamp: NOW - 1000 * 60 * 4,
    reactions: [{ emoji: "💚", count: 2, reacted: false }],
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
    timestamp: NOW - 1000 * 60 * 2,
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
    content: "Este é o canal oficial de boas-vindas. Respeite a comunidade e aproveite a plataforma!",
    timestamp: NOW - 1000 * 60 * 60,
    reactions: [{ emoji: "👋", count: 5, reacted: true }],
  },
  {
    id: "m5",
    channelId: "c-text-3",
    authorId: "u4",
    authorName: "Mariana Costa",
    authorInitials: "MC",
    authorColor: "bg-pamplex-elevated text-pamplex-menta",
    content: "A barra flutuante estilo Spotify na parte de baixo facilita muito controlar o microfone sem procurar ícones minúsculos.",
    timestamp: NOW - 1000 * 60 * 25,
    reactions: [{ emoji: "🎧", count: 4, reacted: true }],
  },
];