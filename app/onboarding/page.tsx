"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Eye,
  BookOpen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  PrimaryLifeArea,
  RelationshipStatus,
  LivingSituation,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────

interface FormData {
  display_name: string;
  primary_life_area: PrimaryLifeArea | null;
  gender: string | null;
  relationship_status: RelationshipStatus | null;
  living_situation: LivingSituation | null;
  email_nudge_enabled: boolean;
  nudge_time: string;
}

const INITIAL_DATA: FormData = {
  display_name: "",
  primary_life_area: null,
  gender: null,
  relationship_status: null,
  living_situation: null,
  email_nudge_enabled: true,
  nudge_time: "09:00",
};

// ─── Slide variants ───────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 52 : -52,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -52 : 52,
    opacity: 0,
  }),
};

const transition = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

// ─── Progress dots ────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 20 : 6,
            background:
              i <= current
                ? "var(--color-text-primary)"
                : "rgba(140,134,128,0.28)",
          }}
          transition={{ duration: 0.25 }}
          className="h-1.5 rounded-full"
          style={{ minWidth: 6 }}
        />
      ))}
    </div>
  );
}

// ─── Back button ──────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
      style={{ color: "var(--color-text-muted)" }}
      aria-label="Go back"
    >
      <ArrowLeft size={15} />
      Back
    </button>
  );
}

// ─── Pill select ──────────────────────────────────────────────

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-all duration-200",
        selected
          ? "border-[#C9915A] bg-[#C9915A]/8 font-medium"
          : "border-[#E0DAD3] bg-white hover:border-[#C9915A]/40"
      )}
      style={{
        color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)",
      }}
    >
      {label}
    </button>
  );
}

// ─── Screen 1: Name ───────────────────────────────────────────

function NameStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h1
        className="text-3xl font-medium leading-tight tracking-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        First, what should I call you?
      </h1>

      <div className="relative w-full max-w-xs">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onNext()}
          placeholder="your name"
          className="w-full bg-transparent pb-3 text-center outline-none"
          style={{
            fontSize: 28,
            color: "var(--color-text-primary)",
          }}
          aria-label="Your name"
          autoComplete="given-name"
          maxLength={40}
        />
        {/* Animated underline */}
        <motion.div
          className="absolute bottom-0 left-0 h-[1.5px]"
          style={{ background: "var(--color-text-primary)" }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
        />
      </div>

      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Just your first name is fine.
      </p>

      <AnimatePresence>
        {value.trim().length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            onClick={onNext}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: "var(--color-text-primary)" }}
            aria-label="Continue"
          >
            <ArrowRight size={20} color="var(--color-background-warm)" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Screen 2: About You ──────────────────────────────────────

const LIFE_AREA_OPTIONS: { label: string; value: PrimaryLifeArea }[] = [
  { label: "Navigating something in my relationship", value: "relationships" },
  { label: "Figuring something out at work", value: "career" },
  { label: "Dealing with family stuff", value: "family" },
  { label: "Mostly just trying to understand myself", value: "self" },
];

function LifeAreaStep({
  value,
  onChange,
  onNext,
  onBack,
  name,
}: {
  value: PrimaryLifeArea | null;
  onChange: (v: PrimaryLifeArea) => void;
  onNext: () => void;
  onBack: () => void;
  name: string;
}) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
          A little context helps me understand you better.
        </p>
        <h2
          className="text-2xl font-medium leading-snug tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {name
            ? `Which of these feels most like you right now, ${name}?`
            : "Which of these feels most like you right now?"}
        </h2>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {LIFE_AREA_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-xl border p-4 text-left text-sm leading-snug transition-all duration-200",
                selected
                  ? "border-[#C9915A] bg-[#C9915A]/8 font-medium"
                  : "border-[#E0DAD3] bg-white hover:border-[#C9915A]/40"
              )}
              style={{
                color: selected
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        You can always talk about anything — this just helps me get started.
      </p>

      <div className="flex items-center justify-between pt-1">
        <BackButton onClick={onBack} />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onNext}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                background: "var(--color-text-primary)",
                color: "var(--color-background-warm)",
              }}
            >
              Continue
              <ArrowRight size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Screen 3: Your Situation ─────────────────────────────────

const GENDER_OPTIONS = ["Man", "Woman", "Non-binary", "Prefer not to say"];

const RELATIONSHIP_OPTIONS: {
  label: string;
  value: RelationshipStatus;
}[] = [
  { label: "Single", value: "single" },
  { label: "In a relationship", value: "partnered" },
  { label: "Married", value: "married" },
  { label: "It's complicated", value: "complicated" },
  { label: "Prefer not to say", value: "prefer not to say" },
];

const LIVING_OPTIONS: { label: string; value: LivingSituation }[] = [
  { label: "I live alone", value: "alone" },
  { label: "With family", value: "with family" },
  { label: "With a partner", value: "with partner" },
  { label: "With roommates", value: "with roommates" },
  { label: "Prefer not to say", value: "prefer not to say" },
];

function SituationStep({
  gender,
  relationship,
  living,
  onGender,
  onRelationship,
  onLiving,
  onNext,
  onBack,
}: {
  gender: string | null;
  relationship: RelationshipStatus | null;
  living: LivingSituation | null;
  onGender: (v: string) => void;
  onRelationship: (v: RelationshipStatus) => void;
  onLiving: (v: LivingSituation) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2
          className="mb-1 text-2xl font-medium tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          A few quick things.
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No right answers. This stays private.
        </p>
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          How do you identify?{" "}
          <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <Pill
              key={opt}
              label={opt}
              selected={gender === opt}
              onClick={() => onGender(gender === opt ? "" : opt)}
            />
          ))}
        </div>
      </div>

      {/* Relationship */}
      <div className="space-y-3">
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          What&apos;s your relationship situation?{" "}
          <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={relationship === opt.value}
              onClick={() =>
                onRelationship(
                  relationship === opt.value ? ("" as RelationshipStatus) : opt.value
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Living */}
      <div className="space-y-3">
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Who do you mostly live with?{" "}
          <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {LIVING_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={living === opt.value}
              onClick={() =>
                onLiving(
                  living === opt.value ? ("" as LivingSituation) : opt.value
                )
              }
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <BackButton onClick={onBack} />
        <button
          onClick={onNext}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-text-primary)",
            color: "var(--color-background-warm)",
          }}
        >
          Continue
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Screen 4: What to Expect ─────────────────────────────────

const EXPECTATIONS = [
  {
    Icon: MessageCircle,
    title: "I listen first",
    body: "Tell me what's going on. I won't rush to give advice.",
  },
  {
    Icon: Eye,
    title: "I'm honest with you",
    body: "If I think there's another way to look at something, I'll say so — gently, but clearly.",
  },
  {
    Icon: BookOpen,
    title: "I remember",
    body: "I'll pick up where we left off. You won't have to re-explain yourself.",
  },
];

function ExpectationsStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2
          className="mb-1 text-2xl font-medium tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Here&apos;s how I work.
        </h2>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          I&apos;m not here to just agree with you.
        </p>
      </div>

      <div className="space-y-6">
        {EXPECTATIONS.map(({ Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
            className="flex gap-4"
          >
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(123,158,135,0.12)" }}
            >
              <Icon size={16} style={{ color: "var(--color-sage)" }} />
            </div>
            <div>
              <p
                className="mb-0.5 text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <BackButton onClick={onBack} />
        <button
          onClick={onNext}
          className="rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-text-primary)",
            color: "var(--color-background-warm)",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─── Screen 5: Nudge Settings ─────────────────────────────────

const TIME_OPTIONS = [
  "06:00","06:30","07:00","07:30","08:00","08:30",
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","13:00","14:00","15:00","16:00","17:00",
  "18:00","19:00","20:00","21:00",
];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

function NudgeStep({
  enabled,
  time,
  timezone,
  onToggle,
  onTime,
  onBack,
  onComplete,
  isSaving,
  saveError,
}: {
  enabled: boolean;
  time: string;
  timezone: string;
  onToggle: (v: boolean) => void;
  onTime: (v: string) => void;
  onBack: () => void;
  onComplete: () => void;
  isSaving: boolean;
  saveError: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2
          className="mb-1 text-2xl font-medium tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Want me to check in with you?
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          If we haven&apos;t talked in a while, I can send you a quiet nudge
          — no pressure.
        </p>
      </div>

      <div
        className="rounded-2xl border p-5 space-y-5"
        style={{ borderColor: "#E0DAD3", background: "white" }}
      >
        {/* Toggle row */}
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              Email check-ins
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              A short note when it&apos;s been a while
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            aria-label="Toggle email check-ins"
          />
        </div>

        {/* Time picker — only when enabled */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="border-t pt-4"
                style={{ borderColor: "#F0EBE5" }}
              >
                <p
                  className="mb-2.5 text-sm"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Best time to reach you?
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTime(t)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs transition-all duration-150",
                        time === t
                          ? "border-[#C9915A] bg-[#C9915A]/8 font-medium"
                          : "border-[#E0DAD3] hover:border-[#C9915A]/40"
                      )}
                      style={{
                        color:
                          time === t
                            ? "var(--color-text-primary)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {formatTime(t)}
                    </button>
                  ))}
                </div>

                {timezone && (
                  <p
                    className="mt-3 text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Your timezone: {timezone.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {saveError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm"
          style={{ color: "var(--color-clay)" }}
        >
          {saveError}
        </motion.p>
      )}

      <div className="flex items-center justify-between pt-1">
        <BackButton onClick={onBack} />
        <button
          onClick={onComplete}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            background: "var(--color-text-primary)",
            color: "var(--color-background-warm)",
          }}
        >
          {isSaving ? "Saving…" : "I'm ready →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [timezone, setTimezone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const TOTAL_STEPS = 5;

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setTimezone("UTC");
    }
  }, []);

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    setIsSaving(true);
    setSaveError(null);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Save profile
    const { error: profileError } = await db
      .from("profiles")
      .update({
        display_name: formData.display_name.trim(),
        primary_life_area: formData.primary_life_area ?? null,
        gender: formData.gender || null,
        relationship_status: formData.relationship_status || null,
        living_situation: formData.living_situation || null,
        timezone: timezone || "UTC",
        onboarding_complete: true,
      })
      .eq("id", user.id);

    if (profileError) {
      setSaveError("Something went wrong. Try again?");
      setIsSaving(false);
      return;
    }

    // Save nudge settings
    await db
      .from("nudge_settings")
      .update({
        email_nudge_enabled: formData.email_nudge_enabled,
        nudge_time: formData.nudge_time,
        nudge_frequency: "daily",
      })
      .eq("user_id", user.id);

    setIsSaving(false);
    setIsCompleting(true);

    await new Promise((r) => setTimeout(r, 1800));

    router.push("/dashboard");
  };

  const steps = [
    <NameStep
      key="name"
      value={formData.display_name}
      onChange={(v) => update("display_name", v)}
      onNext={goNext}
    />,
    <LifeAreaStep
      key="life-area"
      value={formData.primary_life_area}
      name={formData.display_name.trim().split(" ")[0]}
      onChange={(v) => update("primary_life_area", v)}
      onNext={goNext}
      onBack={goBack}
    />,
    <SituationStep
      key="situation"
      gender={formData.gender}
      relationship={formData.relationship_status}
      living={formData.living_situation}
      onGender={(v) => update("gender", v || null)}
      onRelationship={(v) => update("relationship_status", v || null)}
      onLiving={(v) => update("living_situation", v || null)}
      onNext={goNext}
      onBack={goBack}
    />,
    <ExpectationsStep key="expectations" onNext={goNext} onBack={goBack} />,
    <NudgeStep
      key="nudge"
      enabled={formData.email_nudge_enabled}
      time={formData.nudge_time}
      timezone={timezone}
      onToggle={(v) => update("email_nudge_enabled", v)}
      onTime={(v) => update("nudge_time", v)}
      onBack={goBack}
      onComplete={handleComplete}
      isSaving={isSaving}
      saveError={saveError}
    />,
  ];

  return (
    <>
      {/* ── Completion overlay ── */}
      <AnimatePresence>
        {isCompleting && (
          <motion.div
            key="completion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "var(--color-background-warm)" }}
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.3 }}
              className="text-4xl font-medium tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Let&apos;s talk.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="flex min-h-screen flex-col items-center px-5 pb-16 pt-12">
        <div className="w-full max-w-sm">
          {/* Progress dots */}
          <div className="mb-14">
            <ProgressDots current={step} total={TOTAL_STEPS} />
          </div>

          {/* Animated steps */}
          <div className="overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
