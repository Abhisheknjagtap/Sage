"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, className, type, onChange, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [internalValue, setInternalValue] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const isFloating = isFocused || internalValue.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          <input
            ref={ref}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            className={cn(
              "peer w-full rounded-xl border bg-white px-4 pb-2 pt-6 text-base outline-none transition-all duration-200",
              isPassword && "pr-12",
              error
                ? "border-[#C4846A] focus:border-[#C4846A]"
                : "border-[#E8E3DC] focus:border-[#C9915A]",
              className
            )}
            style={{ color: "var(--color-text-primary)" }}
            {...props}
          />

          <label
            className={cn(
              "pointer-events-none absolute left-4 transition-all duration-200",
              isFloating
                ? "top-2 text-xs"
                : "top-1/2 -translate-y-1/2 text-base"
            )}
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </label>

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 transition-opacity hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--color-clay)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";
