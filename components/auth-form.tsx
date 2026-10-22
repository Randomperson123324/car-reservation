"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { signIn, signUp } from "@/app/auth/actions";
import { EASE } from "@/components/page-transition";

type Mode = "login" | "register";

const MODES = [
  { id: "login", label: "เข้าสู่ระบบ", icon: LogIn },
  { id: "register", label: "สมัครสมาชิก", icon: UserRoundPlus },
] as const;

export function AuthForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError: string;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const result =
        mode === "login"
          ? await signIn(email, password, redirectTo)
          : await signUp(fullName, email, password, redirectTo);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPassword("");
      setMode("login");
    });
  }

  const current = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="card animate-fade-up rounded-2xl p-6 sm:p-8"
    >
      <div className="mb-6 flex gap-2 rounded-xl bg-surface-muted p-1.5">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setError("");
            }}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors ${
              mode === id
                ? "bg-brand-600 text-white"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {mode === "register" && (
          <div>
            <label htmlFor="fullName" className="font-semibold text-ink">
              ชื่อ-นามสกุล
            </label>
            <div className="relative mt-2">
              <UserRound
                size={18}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
              />
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="กรอกชื่อ-นามสกุล"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="field pl-10"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="font-semibold text-ink">
            อีเมล
          </label>
          <div className="relative mt-2">
            <Mail
              size={18}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="font-semibold text-ink">
            รหัสผ่าน
          </label>
          <div className="relative mt-2">
            <Lock
              size={18}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder={
                mode === "register" ? "อย่างน้อย 8 ตัวอักษร" : "รหัสผ่าน"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field px-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle transition-colors hover:text-ink-muted"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden text-sm font-semibold text-brand-700"
          >
            <span className="block pt-3">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary mt-6 w-full"
      >
        {pending ? (
          <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <current.icon size={20} aria-hidden />
        )}
        {current.label}
      </button>

    </form>
  );
}
