"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { FloatingInput } from "@/components/ui/floating-input";
import type { Profile } from "@/types";

const schema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

type FormData = z.infer<typeof schema>;

function getErrorMessage(msg: string): string {
  if (
    msg.includes("Invalid login credentials") ||
    msg.includes("invalid_credentials")
  ) {
    return "That doesn't match what we have. Want to try again?";
  }
  if (msg.includes("Email not confirmed")) {
    return "__VERIFY__";
  }
  if (
    msg.includes("user_not_found") ||
    msg.includes("no user found") ||
    msg.includes("User not found")
  ) {
    return "We don't recognize that email.";
  }
  return "Something went quiet on our end. Try again in a moment.";
}

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const supabase = createClient();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setServerError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const msg = getErrorMessage(error.message);
      if (msg === "__VERIFY__") {
        router.push(`/verify?email=${encodeURIComponent(data.email)}`);
        return;
      }
      setServerError(msg);
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()) as { data: Profile | null; error: unknown };

      router.push(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="mb-10">
          <h1
            className="mb-1.5 text-[2rem] font-medium leading-tight tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Welcome back.
          </h1>
          <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
            Your conversations are waiting.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <FloatingInput
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <FloatingInput
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <AnimatePresence>
            {serverError && (
              <motion.p
                key="server-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="pt-1 text-sm"
                style={{ color: "var(--color-clay)" }}
              >
                {serverError}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-xl py-3.5 text-base font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{
              background: "var(--color-text-primary)",
              color: "var(--color-background-warm)",
            }}
          >
            {isSubmitting ? "Signing in…" : "Continue"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ background: "rgba(140,134,128,0.25)" }}
          />
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            or
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(140,134,128,0.25)" }}
          />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border py-3.5 text-sm font-medium transition-colors hover:bg-black/[0.02] disabled:opacity-60"
          style={{
            background: "white",
            borderColor: "rgba(42,40,37,0.12)",
            color: "var(--color-text-primary)",
          }}
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {/* Footer */}
        <p
          className="mt-8 text-center text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--color-text-primary)" }}
          >
            Let&apos;s get started →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}
