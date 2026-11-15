"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const PENDING_INVITE_KEY = "pamplex_pending_invite";
const NAV_KEY = "pamplex_nav_state";
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

type Status = "loading" | "success" | "error";

function cleanServerId(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // mantém o valor original
  }
  const uuid = decoded.match(UUID_REGEX);
  return uuid ? uuid[0].toLowerCase() : decoded.trim();
}

export default function ConviteClient() {
  const router = useRouter();
  const params = useParams();
  const supabase = useMemo(() => createClient(), []);
  const startedRef = useRef<boolean>(false);

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("A validar o convite...");

  const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      const serverId = cleanServerId(rawId ?? "");

      if (!serverId) {
        setStatus("error");
        setMessage("Link de convite inválido.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Sem login: guarda o convite e manda para a home, onde o login é pedido.
      // A página principal entra no servidor automaticamente depois do login.
      if (!session?.user) {
        try {
          localStorage.setItem(PENDING_INVITE_KEY, serverId);
        } catch {
          // ignora
        }
        router.replace("/");
        return;
      }

      const { data, error } = await supabase.rpc("join_server", { p_server_id: serverId });

      if (error || !data) {
        console.error("Erro ao entrar no servidor:", error?.message);
        setStatus("error");
        setMessage(
          error?.message?.includes("server_not_found")
            ? "Convite inválido ou servidor não encontrado."
            : "Não foi possível entrar no servidor. Tente novamente."
        );
        return;
      }

      try {
        localStorage.setItem(
          NAV_KEY,
          JSON.stringify({
            isHomeActive: false,
            activeServerId: String(data),
            activeChannelId: "",
            activeDmUserId: null,
          })
        );
      } catch {
        // ignora
      }

      setStatus("success");
      setMessage("Convite aceito! A abrir o servidor...");
      router.replace("/");
    };

    run();
  }, [rawId, router, supabase]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-pamplex-bg p-6 text-pamplex-text-primary">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center backdrop-blur-md">
        <h1 className="mb-2 text-xl font-bold">Convite Pamplex</h1>
        <p
          className={`text-sm ${
            status === "error" ? "text-red-400" : "text-pamplex-text-muted"
          }`}
        >
          {message}
        </p>

        {status === "error" && (
          <div className="mt-5">
            <Button variant="primary" onClick={() => router.replace("/")}>
              Ir para o Pamplex
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}