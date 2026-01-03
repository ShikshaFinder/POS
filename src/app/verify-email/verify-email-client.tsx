"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck, MailWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type VerifyStatus = "idle" | "verifying" | "success" | "error";
type ResendStatus = "idle" | "submitting" | "success" | "error";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>(
    urlToken ? "verifying" : "idle"
  );
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const sanitizedToken = useMemo(() => urlToken?.trim(), [urlToken]);

  useEffect(() => {
    const token = sanitizedToken;
    if (!token) {
      setVerifyStatus("idle");
      setVerifyMessage(null);
      return;
    }

    let aborted = false;

    const verify = async () => {
      setVerifyStatus("verifying");
      setVerifyMessage(null);

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json();

        if (aborted) {
          return;
        }

        if (!response.ok) {
          setVerifyStatus("error");
          setVerifyMessage(data.error ?? "Verification link is invalid.");
          return;
        }

        setVerifyStatus("success");
        setVerifyMessage(
          data.message ?? "Email verified successfully. You can sign in now."
        );
      } catch (error) {
        if (aborted) {
          return;
        }
        console.error(error);
        setVerifyStatus("error");
        setVerifyMessage("Something went wrong while verifying the token.");
      }
    };

    void verify();

    return () => {
      aborted = true;
    };
  }, [sanitizedToken]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      setResendStatus("error");
      setResendMessage("Please enter the email you signed up with.");
      return;
    }

    setResendStatus("submitting");
    setResendMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setResendStatus("error");
        setResendMessage(
          data.error ?? "Unable to resend verification email right now."
        );
        return;
      }

      setResendStatus("success");
      setResendMessage(
        data.message ??
          "If that account exists, a new verification email is on the way."
      );
    } catch (error) {
      console.error(error);
      setResendStatus("error");
      setResendMessage("Something went wrong. Please try again.");
    }
  };

  const showVerifiedIcon = verifyStatus === "success";
  const showErrorIcon = verifyStatus === "error";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-white">
      <Card className="w-full max-w-lg border-slate-800/70 bg-slate-950/60 text-white backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-400">
            {showVerifiedIcon ? (
              <MailCheck className="h-6 w-6" />
            ) : showErrorIcon ? (
              <MailWarning className="h-6 w-6 text-rose-400" />
            ) : null}
            <CardTitle className="text-2xl">Verify your email</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Paste the link from your inbox in this browser, or request another
            email if the original link expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-2">
            <p className="text-sm text-slate-400">
              {sanitizedToken
                ? "Hang tight, we’re confirming your verification link."
                : "Open the verification email we sent and click on the included link."}
            </p>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
              {verifyStatus === "verifying" && (
                <span className="flex items-center gap-2 text-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking your verification token...
                </span>
              )}
              {verifyStatus === "success" && (
                <span className="text-emerald-400">{verifyMessage}</span>
              )}
              {verifyStatus === "error" && (
                <span className="text-rose-400">
                  {verifyMessage ?? "Verification failed."}
                </span>
              )}
              {verifyStatus === "idle" && (
                <span className="text-slate-400">
                  Provide a token by opening the email link, or request a new
                  email below.
                </span>
              )}
            </div>
            {verifyStatus === "success" && (
              <Button asChild className="w-full">
                <Link href="/signin">Continue to sign in</Link>
              </Button>
            )}
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white">
                Need a fresh email?
              </h3>
              <p className="text-sm text-slate-400">
                Enter your email address and we&apos;ll send another link.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                className="bg-slate-900/60"
                value={resendEmail}
                onChange={(event) => setResendEmail(event.target.value)}
                autoComplete="email"
              />
              <Button
                onClick={handleResend}
                disabled={resendStatus === "submitting"}
                className="w-full"
              >
                {resendStatus === "submitting" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Resend verification email
              </Button>
            </div>
            {resendMessage && (
              <p
                className={`rounded-md px-3 py-2 text-sm ${
                  resendStatus === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
              >
                {resendMessage}
              </p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

