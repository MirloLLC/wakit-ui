import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { GoogleOutlined, GithubOutlined } from "@ant-design/icons";

type OAuthProvider = "google" | "github";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string; error_code?: string } => ({
    redirect: (search.redirect as string) || undefined,
    error_code: (search.error_code as string) || undefined,
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const { redirect, error_code } = Route.useSearch();

  const { translate: t } = useTranslation();

  async function handleLogInWithOauth(provider: OAuthProvider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + (redirect || "/"),
      },
    });
  }

  async function handleLogInWithEmail(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(t("¡Credenciales inválidas!"));
    } else {
      setEmail("");
      setPassword("");
    }
  }

  return (
    <div className="flex flex-col gap-9 justify-center items-center bg-background text-foreground h-dvh w-screen">
      <div className="text-primary font-[800] text-[36px]" style={{ letterSpacing: "-0.05em" }}>
        wakit
      </div>

      <div className="flex flex-col gap-3 w-[250px]">
        {error_code === "otp_expired" && (
          <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 text-sm p-3 rounded-lg text-center">
            {t("El enlace de invitación expiró.")}{" "}
            <Link to="/signup" className="underline font-medium">
              {t("Crea tu cuenta aquí")}
            </Link>
          </div>
        )}

        <button
          type="button"
          className="primary bg-blue-500 hover:bg-blue-400 text-white w-full border-none"
          onClick={() => handleLogInWithOauth("google")}
        >
          <GoogleOutlined /> {t("Continuar con Google")}
        </button>

        <button
          type="button"
          className="primary bg-gray-900 hover:bg-gray-800 text-white w-full border-none"
          onClick={() => handleLogInWithOauth("github")}
        >
          <GithubOutlined /> {t("Continuar con GitHub")}
        </button>

        <div className="border-b border-border w-full" />

        <form onSubmit={handleLogInWithEmail} className="login-form">
          <label>
            <div className="label">{t("Correo electrónico")}</div>
            <input
              className="text"
              placeholder="you@company.com"
              type="text"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
            />
          </label>

          <label>
            <div className="label">{t("Contraseña")}</div>
            <input
              className="text"
              placeholder="******"
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
          </label>

          {message && (
            <div className="self-center text-destructive text-md">{message}</div>
          )}

          <button
            type="submit"
            className="primary w-full mt-[16px]"
          >
            {t("Entrar")}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          {t("¿No tienes cuenta?")}{" "}
          <Link to="/signup" className="text-primary underline">
            {t("Crear cuenta")}
          </Link>
        </div>
      </div>
    </div>
  );
}