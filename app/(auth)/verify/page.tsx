"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const supabase = createClient();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setResendStatus("sending");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 3000);
    } else {
      setResendStatus("sent");
      setCooldown(30);
      setTimeout(() => setResendStatus("idle"), 3000);
    }
  }, [email, cooldown, supabase.auth]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm text-center"
      >
        {/* Abstract envelope shape */}
        <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center">
          <div className="relative">
            {/* Outer ring — pulsing */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(123,158,135,0.15)" }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Inner circle */}
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "rgba(123,158,135,0.12)" }}
            >
              {/* Envelope SVG — CSS drawn */}
              <svg
                width="32"
                height="24"
                viewBox="0 0 32 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="22"
                  rx="3"
                  stroke="#7B9E87"
                  strokeWidth="1.5"
                />
                <path
                  d="M1 4l15 10L31 4"
                  stroke="#7B9E87"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1
          className="mb-3 text-[2rem] font-medium leading-tight tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Check your inbox.
        </h1>

        {/* Body */}
        <p
          className="mb-1 text-base leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          We sent a link to{" "}
          <span
            className="font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {email || "your email"}
          </span>
          .
        </p>
        <p
          className="mb-10 text-base"
          style={{ color: "var(--color-text-muted)" }}
        >
          Click it to continue — it only takes a second.
        </p>

        {/* Resend */}
        <div className="space-y-2">
          {resendStatus === "sent" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm"
              style={{ color: "var(--color-sage)" }}
            >
              Sent. Check your inbox again.
            </motion.p>
          )}

          {resendStatus === "error" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm"
              style={{ color: "var(--color-clay)" }}
            >
              Couldn&apos;t send. Try again in a moment.
            </motion.p>
          )}

          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Didn&apos;t get it?{" "}
            {cooldown > 0 ? (
              <span>Resend in {cooldown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendStatus === "sending"}
                className="font-medium underline-offset-2 hover:underline disabled:opacity-50"
                style={{ color: "var(--color-text-primary)" }}
              >
                {resendStatus === "sending" ? "Sending…" : "Resend the link"}
              </button>
            )}
          </p>
        </div>

        {/* Back */}
        <p
          className="mt-12 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Wrong email?{" "}
          <a
            href="/signup"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--color-text-primary)" }}
          >
            Start over
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
