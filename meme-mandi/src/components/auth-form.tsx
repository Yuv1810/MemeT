"use client";
import Link from "next/link";
import { Smile, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api } from "./store-provider";
type Mode = "login" | "register" | "forgot" | "verify" | "reset";
export function AuthForm({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState(initialMode),
    [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [resendAt, setResendAt] = useState(0);
  const content = {
    login: ["WELCOME BACK.", "Your group chat wardrobe is waiting."],
    register: ["JOIN THE GROUP CHAT.", "Create your account with an email and password."],
    forgot: ["FORGOT THE PASSWORD?", "It happens. We'll email you a code to reset it."],
    verify: [
      "CHECK YOUR INBOX.",
      "Enter the six-digit code sent to your email. It expires in 10 minutes.",
    ],
    reset: ["A FRESH START.", "Use the code from your email and choose a new password."],
  }[mode];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await api<{ needsVerification?: boolean; message?: string }>(
        `/api/auth/${mode}`,
        "POST",
        { email, name, password, code },
      );
      if (mode === "register" || result.needsVerification) {
        setMode("verify");
        setResendAt(Date.now() + 60000);
        setMessage(result.message || "Check your inbox for your code.");
      } else if (mode === "forgot") {
        setMode("reset");
        setMessage(result.message || "Check your email.");
      } else if (mode === "reset") {
        setMode("login");
        setPassword("");
        setCode("");
        setMessage("Password reset. Sign in with your new password.");
      } else {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.assign(
          next === "/checkout" || next === "/admin" || next === "/orders" ? next : "/",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      if (Date.now() < resendAt)
        throw new Error("Please wait 60 seconds before requesting another code.");
      const result = await api<{ message: string }>(
        `/api/auth/${mode === "reset" ? "forgot" : "resend"}`,
        "POST",
        { email },
      );
      setMessage(result.message);
      setResendAt(Date.now() + 60000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-shell">
      <div className="auth-brand">
        <Smile />
        <span className="eyebrow">YOUR PEOPLE. YOUR PRINTS.</span>
        <h2>
          GOOD FITS.
          <br />
          GREAT BITS.
          <br />
          YOU'RE IN.
        </h2>
        <p>A wardrobe that gets your sense of humour. The rest is just good cotton.</p>
      </div>
      <div className="auth-form-container">
        <h1>{content[0]}</h1>
        <p>{content[1]}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        <form onSubmit={submit}>
          {mode === "register" && (
            <label className="field">
              <span>Your name</span>
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
              />
            </label>
          )}
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              readOnly={mode === "verify" || mode === "reset"}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {(mode === "verify" || mode === "reset") && (
            <label className="field">
              <span>Verification code</span>
              <input
                className="otp-input"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </label>
          )}
          {["login", "register", "reset"].includes(mode) && (
            <label className="field">
              <span>{mode === "reset" ? "New password" : "Password"}</span>
              <div className="password-input">
                <input
                  type={visible ? "text" : "password"}
                  name="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "login" ? "Your password" : "At least 10 characters"}
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
          )}
          {mode === "login" && (
            <div className="form-link-row">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
          )}
          <button className="button button-dark full" disabled={busy}>
            {busy
              ? "One moment…"
              : {
                  login: "Sign in",
                  register: "Create account",
                  forgot: "Send reset code",
                  verify: "Verify email",
                  reset: "Reset password",
                }[mode]}
          </button>
        </form>
        {(mode === "verify" || mode === "reset") && (
          <>
            <button className="text-button" disabled={busy} onClick={resend}>
              Didn't get it? Resend code
            </button>
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "reset" ? "forgot" : "register");
                setError("");
                setMessage("");
                setCode("");
              }}
            >
              Use a different email
            </button>
          </>
        )}
        {mode === "login" ? (
          <p className="auth-switch">
            New to MemT? <Link href="/register">Create an account</Link>
          </p>
        ) : (
          <p className="auth-switch">
            Already part of the group? <Link href="/login">Sign in</Link>
          </p>
        )}
      </div>
    </section>
  );
}
