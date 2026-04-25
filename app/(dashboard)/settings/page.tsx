"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AgeRange,
  RelationshipStatus,
  LivingSituation,
  NudgeFrequency,
  Profile,
  NudgeSettings,
} from "@/types/database";

// ── Shared Pill selector ───────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="px-3 py-1.5 rounded-full text-sm transition-all duration-150"
              style={{
                background: selected ? "rgba(201,145,90,0.1)" : "rgba(140,134,128,0.08)",
                color: selected ? "var(--color-accent)" : "var(--color-text-muted)",
                border: selected ? "1px solid rgba(201,145,90,0.4)" : "1px solid transparent",
                fontWeight: selected ? 500 : 400,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Save status indicator ──────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveButton({
  status,
  onClick,
}: {
  status: SaveStatus;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onClick}
        disabled={status === "saving"}
        className="text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-50"
        style={{
          background: "var(--color-text-primary)",
          color: "var(--color-background-warm)",
        }}
      >
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>

      <AnimatePresence mode="wait">
        {status === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm"
            style={{ color: "#7B9E87" }}
          >
            Saved ✓
          </motion.span>
        )}
        {status === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm"
            style={{ color: "var(--color-clay)" }}
          >
            Something went wrong on my end. Give it another try?
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="text-xs font-medium uppercase tracking-widest pb-4"
      style={{ color: "var(--color-text-muted)", borderBottom: "1px solid rgba(140,134,128,0.12)" }}
    >
      {title}
    </h2>
  );
}

// ── Skeleton ───────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: "rgba(140,134,128,0.1)" }}
    />
  );
}

// ── Constants ──────────────────────────────────────────────────

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: "18-22", label: "18–22" },
  { value: "23-27", label: "23–27" },
  { value: "28-32", label: "28–32" },
  { value: "33-40", label: "33–40" },
];

const RELATIONSHIP_STATUSES: { value: RelationshipStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "partnered", label: "Partnered" },
  { value: "married", label: "Married" },
  { value: "complicated", label: "It's complicated" },
  { value: "prefer not to say", label: "Prefer not to say" },
];

const LIVING_SITUATIONS: { value: LivingSituation; label: string }[] = [
  { value: "alone", label: "Alone" },
  { value: "with family", label: "With family" },
  { value: "with partner", label: "With partner" },
  { value: "with roommates", label: "With roommates" },
  { value: "prefer not to say", label: "Prefer not to say" },
];

const NUDGE_FREQUENCIES: { value: NudgeFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "every2days", label: "Every couple days" },
  { value: "weekly", label: "Weekly" },
];

// ── Main page ──────────────────────────────────────────────────

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [nudge, setNudge] = useState<Partial<NudgeSettings>>({
    email_nudge_enabled: false,
    nudge_time: "09:00",
    nudge_frequency: "every2days",
  });
  const [profileStatus, setProfileStatus] = useState<SaveStatus>("idle");
  const [nudgeStatus, setNudgeStatus] = useState<SaveStatus>("idle");
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const [profileResult, nudgeResult] = await Promise.all([
        db.from("profiles").select("*").eq("id", user.id).single(),
        db.from("nudge_settings").select("*").eq("user_id", user.id).single(),
      ]);

      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (nudgeResult.data) setNudge(nudgeResult.data as NudgeSettings);
      setLoading(false);
    }

    load();
  }, []);

  async function saveProfile() {
    setProfileStatus("saving");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await db.from("profiles").update({
      display_name: profile.display_name,
      age_range: profile.age_range,
      relationship_status: profile.relationship_status,
      living_situation: profile.living_situation,
    }).eq("id", user.id);

    setProfileStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setProfileStatus("idle"), 2500);
  }

  async function saveNudgeSettings() {
    setNudgeStatus("saving");
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await db.from("nudge_settings").upsert({
      user_id: user.id,
      email_nudge_enabled: nudge.email_nudge_enabled ?? false,
      nudge_time: nudge.nudge_time ?? "09:00",
      nudge_frequency: nudge.nudge_frequency ?? "every2days",
    }, { onConflict: "user_id" });

    setNudgeStatus(error ? "error" : "saved");
    if (!error) setTimeout(() => setNudgeStatus("idle"), 2500);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [convResult, msgResult] = await Promise.all([
        db.from("conversations").select("*").eq("user_id", user.id).order("started_at", { ascending: true }),
        db.from("messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);

      const conversations = convResult.data ?? [];
      const messages = msgResult.data ?? [];

      const exportData = {
        exportedAt: new Date().toISOString(),
        conversations: conversations.map((conv: Record<string, unknown>) => ({
          ...conv,
          messages: messages.filter(
            (m: Record<string, unknown>) => m.conversation_id === conv.id
          ),
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `companion-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-5 py-10 md:py-14 space-y-10">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-10 md:py-14">
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-2xl font-light mb-10"
        style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
      >
        Settings
      </motion.h1>

      <div className="space-y-12">
        {/* ── Section 1: Profile ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <SectionHeader title="Profile" />
          <div className="mt-5 space-y-5">
            {/* Display name */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Display name
              </label>
              <input
                type="text"
                value={profile.display_name ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, display_name: e.target.value }))
                }
                placeholder="Your name"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(140,134,128,0.2)",
                }}
              />
            </div>

            <PillGroup
              label="Age range"
              options={AGE_RANGES}
              value={profile.age_range ?? null}
              onChange={(v) => setProfile((p) => ({ ...p, age_range: v }))}
            />

            <PillGroup
              label="Relationship status"
              options={RELATIONSHIP_STATUSES}
              value={profile.relationship_status ?? null}
              onChange={(v) => setProfile((p) => ({ ...p, relationship_status: v }))}
            />

            <PillGroup
              label="Living situation"
              options={LIVING_SITUATIONS}
              value={profile.living_situation ?? null}
              onChange={(v) => setProfile((p) => ({ ...p, living_situation: v }))}
            />

            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              This helps me understand your context. It&apos;s never shared.
            </p>

            <SaveButton status={profileStatus} onClick={saveProfile} />
          </div>
        </motion.section>

        {/* ── Section 2: Check-Ins ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <SectionHeader title="Check-Ins" />
          <div className="mt-5 space-y-5">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Email check-ins
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  A gentle nudge when you&apos;ve been quiet
                </p>
              </div>
              <Switch
                checked={nudge.email_nudge_enabled ?? false}
                onCheckedChange={(v) =>
                  setNudge((n) => ({ ...n, email_nudge_enabled: v }))
                }
              />
            </div>

            <AnimatePresence>
              {nudge.email_nudge_enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-4"
                >
                  {/* Preferred time */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Preferred time
                    </label>
                    <input
                      type="time"
                      value={nudge.nudge_time ?? "09:00"}
                      onChange={(e) =>
                        setNudge((n) => ({ ...n, nudge_time: e.target.value }))
                      }
                      className="px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        background: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        border: "1px solid rgba(140,134,128,0.2)",
                      }}
                    />
                  </div>

                  {/* Frequency */}
                  <PillGroup
                    label="Frequency"
                    options={NUDGE_FREQUENCIES}
                    value={nudge.nudge_frequency ?? null}
                    onChange={(v) => setNudge((n) => ({ ...n, nudge_frequency: v }))}
                  />

                  {/* Preview */}
                  <div>
                    <p
                      className="text-xs font-medium mb-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      What it looks like
                    </p>
                    <div
                      className="rounded-xl p-4"
                      style={{ background: "var(--color-surface)" }}
                    >
                      <p
                        className="text-xs mb-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Subject: {profile.display_name ? `${profile.display_name}, a quiet check-in` : "A quiet check-in"}
                      </p>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        You were working through something last week — how&apos;s it sitting now?
                      </p>
                      <p
                        className="text-xs mt-3"
                        style={{ color: "var(--color-accent)" }}
                      >
                        Open the app →
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <SaveButton status={nudgeStatus} onClick={saveNudgeSettings} />
          </div>
        </motion.section>

        {/* ── Section 3: Conversations ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <SectionHeader title="Conversations" />
          <div className="mt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Export my conversations
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Downloads a JSON file of all your messages.
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="shrink-0 text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                style={{
                  background: "rgba(140,134,128,0.1)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(140,134,128,0.2)",
                }}
              >
                {exportLoading ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── Section 4: Account ── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <SectionHeader title="Account" />
          <div className="mt-5 space-y-5">
            {/* Email (read only) */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                Email
              </label>
              <div
                className="px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(140,134,128,0.06)",
                  color: "var(--color-text-muted)",
                  border: "1px solid rgba(140,134,128,0.12)",
                }}
              >
                {email}
              </div>
            </div>

            {/* Delete account */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(196,132,106,0.06)",
                border: "1px solid rgba(196,132,106,0.2)",
              }}
            >
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--color-clay)" }}
              >
                Delete my account
              </p>
              <p
                className="text-xs mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                Permanently removes your account and all conversations.
              </p>
              <button
                onClick={() => setDeleteOpen(true)}
                className="text-sm px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: "rgba(196,132,106,0.12)",
                  color: "var(--color-clay)",
                }}
              >
                Delete account
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          style={{ background: "var(--color-surface)", borderColor: "rgba(140,134,128,0.15)" }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-base font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {deleteConfirmed
                ? "We'll take care of it"
                : "This will permanently delete your account and all your conversations."}
            </DialogTitle>
          </DialogHeader>

          {deleteConfirmed ? (
            <div className="py-2 space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                This feature is being finalized. Email us at{" "}
                <a
                  href="mailto:hi@yourcompanion.app"
                  className="underline"
                  style={{ color: "var(--color-accent)" }}
                >
                  hi@yourcompanion.app
                </a>{" "}
                and we&apos;ll handle it within 24 hours.
              </p>
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmed(false);
                  setDeleteText("");
                }}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ background: "rgba(140,134,128,0.1)", color: "var(--color-text-primary)" }}
              >
                Close
              </button>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Type{" "}
                <span
                  className="font-mono font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  delete
                </span>{" "}
                to confirm.
              </p>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="delete"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(140,134,128,0.06)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(140,134,128,0.2)",
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteOpen(false);
                    setDeleteText("");
                  }}
                  className="flex-1 text-sm px-4 py-2 rounded-lg"
                  style={{ background: "rgba(140,134,128,0.1)", color: "var(--color-text-muted)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setDeleteConfirmed(true)}
                  disabled={deleteText !== "delete"}
                  className="flex-1 text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-30"
                  style={{ background: "var(--color-clay)", color: "white" }}
                >
                  Delete account
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
