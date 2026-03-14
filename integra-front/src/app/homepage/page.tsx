"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      // 1) LOGIN
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Erro ${res.status}`);
      }

      const data = await res.json();
      if (!data?.access_token) {
        throw new Error("Resposta inválida da API: access_token ausente");
      }

      // salva o token
      localStorage.setItem("authToken", data.access_token);

      // opcional: salve a data de expiração se a API retornar
      if (data.expires_in) {
        const expiry = Date.now() + Number(data.expires_in) * 1000;
        localStorage.setItem("authTokenExpiresAt", String(expiry));
      }

      // 2) REGISTRA SESSÃO NO BACKEND (loginSession)
      try {
        await fetch(`${apiBase}/sync/loginSession`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.access_token}`,
          },
          body: JSON.stringify({
            userEmail: email, // ou "email" se seu backend espera essa chave
          }),
        });
      } catch (err) {
        console.error("Erro ao registrar sessão em /sync/loginSession:", err);
        // aqui não bloqueio o login, só loga o erro
      }

      // 3) REDIRECIONA PARA /inicio
      router.push("/inicio");
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error(err);
      }
      setError("Credenciais inválidas ou erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-8 pt-8 pb-4 flex flex-col items-center">
            <Image
              src="/eletro_farias.png"
              alt="Logo da Empresa"
              width={256}
              height={96}
              className="h-auto w-56 mb-4"
              priority
            />
            <h1 className="text-2xl font-semibold text-slate-800">Entrar</h1>
            <p className="text-sm text-slate-500 mt-1">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-4">
            {error && (
              <div
                id="login-error"
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3"
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 my-auto text-slate-500 text-sm hover:text-slate-700"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-white font-medium shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>

            <p className="text-center text-xs text-slate-500">
              Ao continuar, você concorda com nossos Termos e Política de
              Privacidade.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
