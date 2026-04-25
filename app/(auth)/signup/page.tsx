"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { FloatingInput } from "@/components/ui/floating-input";

const schema = z.object({
  email: z.string().email("Please enter a valid email."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/\d/, "Password must contain at least one number."),
});

type FormData = z.infer<typeof schema>;

interface Requirement {
  label: string;
  test: (val: string) => boolean;
}

const PASSWORD_REQUIREMENTS: Requirement[] = [
  { label: "8 or more characters", test: (v) => v.length >= 8 },
  { label: "Contains a number", test: (v) => /\d/.test(v) },
];

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const supabase = createClient();

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setServerError(null);

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setServerError(
          "That email already has an account. Try signing in instead."
        );
      } else {
        setServerError("Something went quiet on our end. Try again in a moment.");
      }
      setIsSubmitting(false);
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(data.email)}`);
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

  const passwordRegister = register("password");

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
            Let&apos;s set up your space.
          </h1>
          <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
            We&apos;ll keep it simple. Just the basics for now.
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
            autoComplete="new-password"
            error={errors.password?.message}
            {...passwordRegister}
            onChange={(e) => {
              setPasswordValue(e.target.value);
              passwordRegister.onChange(e);
            }}
          />

          {/* Password requirements */}
          <AnimatePresence>
            {passwordValue.length > 0 && (
              <motion.div
                key="requirements"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pt-1">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const met = req.test(passwordValue);
                    return (
                      <motion.div
                        key={req.label}
                        className="flex items-center gap-2"
                        animate={{ opacity: met ? 1 : 0.5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-300"
                          style={{
                            background: met
                              ? "var(--color-sage)"
                              : "rgba(140,134,128,0.2)",
                          }}
                        >
                          <Check
                            size={10}
                            strokeWidth={3}
                            style={{ color: met ? "white" : "transparent" }}
                          />
                        </span>
                        <span
                          className="text-xs transition-colors duration-300"
                          style={{
                            color: met
                              ? "var(--color-sage)"
                              : "var(--color-text-muted)",
                          }}
                        >
                          {req.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {serverError && (
              <motion.p
                key="server-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
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
            {isSubmitting ? "Creating your space…" : "Continue"}
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
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--color-text-primary)" }}
          >
            Sign in →
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
