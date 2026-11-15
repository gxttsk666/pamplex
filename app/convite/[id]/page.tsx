import { Suspense } from "react";
import ConviteClient from "./ConviteClient";

export default function ConvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-pamplex-bg p-6 text-pamplex-text-primary">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center backdrop-blur-md">
            <h1 className="mb-2 text-xl font-bold">Convite Pamplex</h1>
            <p className="text-sm text-pamplex-text-muted">
              A validar o convite...
            </p>
          </div>
        </div>
      }
    >
      <ConviteClient />
    </Suspense>
  );
}
