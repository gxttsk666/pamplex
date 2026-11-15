import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const room = url.searchParams.get("room");
  const username = url.searchParams.get("username");

  if (!room) {
    return NextResponse.json({ error: 'Falta o parâmetro "room"' }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ error: 'Falta o parâmetro "username"' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "Servidor LiveKit não configurado corretamente nas variáveis de ambiente." },
      { status: 500 }
    );
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, { identity: username });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}