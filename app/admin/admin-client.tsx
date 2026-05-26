"use client";

import { FormEvent, useState } from "react";

type Mode = "login" | "setup";

export function AdminAuthPanel({ needsSetup, adminEmail }: { needsSetup: boolean; adminEmail: string }) {
  const [mode, setMode] = useState<Mode>(needsSetup ? "setup" : "login");
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(mode === "setup" ? "/api/admin/setup" : "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "setup" ? { password, setupToken } : { email, password }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Åtgärden misslyckades.");
      setLoading(false);
      return;
    }

    if (mode === "setup") {
      setMode("login");
      setPassword("");
      setSetupToken("");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-[#d8d6c8] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#54665c]">Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#15201b]">
        {mode === "setup" ? "Skapa adminlösenord" : "Logga in"}
      </h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "login" ? (
          <label className="block text-sm font-medium text-[#26332d]">
            E-post
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#d8d6c8] px-3 py-3"
            />
          </label>
        ) : null}
        {mode === "setup" ? (
          <label className="block text-sm font-medium text-[#26332d]">
            Setup-token
            <input
              type="password"
              value={setupToken}
              onChange={(event) => setSetupToken(event.target.value)}
              className="mt-2 w-full rounded-md border border-[#d8d6c8] px-3 py-3"
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium text-[#26332d]">
          Lösenord
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-[#d8d6c8] px-3 py-3"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="min-h-12 w-full rounded-md bg-[#173f32] px-5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Vänta..." : mode === "setup" ? "Skapa lösenord" : "Logga in"}
        </button>
      </form>
    </div>
  );
}

export function AdminLogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-md border border-[#d8d6c8] bg-white px-4 py-2 text-sm font-semibold text-[#173f32]"
    >
      Logga ut
    </button>
  );
}
