"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConvitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState("A processar o seu convite...");

  useEffect(() => {
    const acceptInvite = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setStatus("Faça login primeiro na página inicial e abra o convite novamente.");
        setTimeout(() => router.push("/"), 2500);
        return;
      }

      const { data: srv } = await supabase
        .from("servers")
        .select("id")
        .eq("id", id)
        .single();

      if (!srv) {
        setStatus("Convite inválido ou servidor não encontrado.");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      await supabase.from("server_members").upsert(
        {
          server_id: srv.id,
          user_id: session.user.id,
          role: "member",
        },
        { onConflict: "server_id,user_id" }
      );

      localStorage.setItem(
        "pamplex_nav_state",
        JSON.stringify({
          isHomeActive: false,
          activeServerId: srv.id,
          activeChannelId: "",
          activeDmUserId: null,
        })
      );

      router.push("/");
    };

    if (id) acceptInvite();
  }, [id, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-pamplex-bg text-pamplex-text-primary">
      <p className="text-sm text-pamplex-text-muted">{status}</p>
    </div>
  );
}