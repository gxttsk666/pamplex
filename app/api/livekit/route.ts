import { NextResponse } from "next/server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const room = url.searchParams.get("room");
  const requestedName = url.searchParams.get("username");

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !apiKey && "LIVEKIT_API_KEY",
    !apiSecret && "LIVEKIT_API_SECRET",
    !wsUrl && "NEXT_PUBLIC_LIVEKIT_URL",
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean) as string[];

  if (missing.length > 0 || !apiKey || !apiSecret || !wsUrl || !supabaseUrl || !supabaseAnonKey) {
    // Só os NOMES das variáveis em falta; nunca os valores
    return NextResponse.json(
      {
        error: `Variáveis de ambiente em falta no servidor: ${missing.join(", ")}. Defina-as na Vercel e faça um novo deploy.`,
      },
      { status: 500 }
    );
  }

  // 1. Só utilizadores autenticados no Pamplex podem aceder à API de voz
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  // 1B. Endpoint para listar quem está nos canais de voz (mesmo antes de entrar na call)
  if (action === "rooms") {
    const roomsParam = url.searchParams.get("rooms") ?? "";
    const roomIds = roomsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (roomIds.length === 0) {
      return NextResponse.json({ byRoom: {} });
    }

    // Valida via RLS quais canais o utilizador realmente pode ver
    const { data: allowedChannels } = await supabase
      .from("channels")
      .select("id")
      .in("id", roomIds);

    const allowedIds = new Set(
      (allowedChannels ?? []).map((c) => (c as { id: string }).id)
    );

    const httpUrl = wsUrl.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    const byRoom: Record<string, { id: string; name: string; muted: boolean }[]> = {};

    await Promise.all(
      roomIds
        .filter((id) => allowedIds.has(id))
        .map(async (roomId) => {
          try {
            const participants = await roomService.listParticipants(roomId);
            byRoom[roomId] = participants.map((p) => {
              const hasMutedAudio = p.tracks.some((t) => t.type === 0 && t.muted);
              return {
                id: p.identity,
                name: p.name || p.identity,
                muted: hasMutedAudio,
              };
            });
          } catch {
            // Sala ainda não criada no LiveKit = 0 participantes
            byRoom[roomId] = [];
          }
        })
    );

    return NextResponse.json({ byRoom });
  }

  // 2. Geração de token para entrar numa sala específica
  if (!room) {
    return NextResponse.json({ error: 'Falta o parâmetro "room"' }, { status: 400 });
  }

  if (room.startsWith("dm-")) {
    if (!room.includes(user.id)) {
      return NextResponse.json({ error: "Sem acesso a esta chamada." }, { status: 403 });
    }
  } else {
    // O RLS de `channels` só devolve canais de servidores onde o utilizador é membro
    const { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("id", room)
      .maybeSingle();

    if (!channel) {
      return NextResponse.json({ error: "Sem acesso a esta sala." }, { status: 403 });
    }
  }

  try {
    // A identidade vem do utilizador autenticado, não de um parâmetro da URL
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ||
      requestedName?.slice(0, 40) ||
      user.email?.split("@")[0] ||
      "Membro";

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: displayName,
    });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });

    const token = await at.toJwt();
    return NextResponse.json({ token, url: wsUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar token.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}