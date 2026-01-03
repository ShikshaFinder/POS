import { Suspense } from "react";

import { VerifyEmailClient } from "@/app/verify-email/verify-email-client";

function VerifyEmailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-white">
      <div className="w-full max-w-lg rounded-lg border border-slate-800/70 bg-slate-950/60 p-10 text-center text-slate-300">
        Checking your verification link...
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}

