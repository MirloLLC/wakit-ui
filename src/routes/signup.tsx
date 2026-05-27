import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { GoogleOutlined, GithubOutlined } from "@ant-design/icons";

type OAuthProvider = "google" | "github";

export const Route = createFileRoute("/signup")({
  validateSearch: (search): { invite?: boolean; org?: string } => ({
    invite: search.invite === "true" || search.invite === true ? true : undefined,
    org: (search.org as string) || undefined,
  }),
  component: Signup,
});

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const { invite, org } = Route.useSearch();

  const { translate: t } = useTranslation();

  async function handleSignUpWithOauth(provider: OAuthProvider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + "/",
      },
    });
  }

  async function handleSignUpWithEmail(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage(t("Las contraseñas no coinciden"));
      return;
    }

    if (password.length < 6) {
      setMessage(t("La contraseña debe tener al menos 6 caracteres"));
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/",
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setSuccess(true);
      setMessage(t("Revisa tu correo para confirmar tu cuenta"));
    }
  }

  return (
    <div className="flex flex-col gap-9 justify-center items-center bg-background text-foreground h-dvh w-screen">
      <div className="text-primary font-[800] text-[36px]" style={{ letterSpacing: "-0.05em" }}>
        wakit
      </div>

      <div className="flex flex-col gap-3 w-[250px]">
        {invite && org && (
          <div className="bg-primary/10 text-primary text-sm p-3 rounded-lg text-center">
            {t("Te invitaron a")} <strong>{decodeURIComponent(org)}</strong>. {t("Crea tu cuenta para unirte.")}
          </div>
        )}

        <button
          type="button"
          className="primary bg-blue-500 hover:bg-blue-400 text-white w-full border-none"
          onClick={() => handleSignUpWithOauth("google")}
        >
          <GoogleOutlined /> {t("Continuar con Google")}
        </button>

        <button
          type="button"
          className="primary bg-gray-900 hover:bg-gray-800 text-white w-full border-none"
          onClick={() => handleSignUpWithOauth("github")}
        >
          <GithubOutlined /> {t("Continuar con GitHub")}
        </button>

        <div className="border-b border-border w-full" />

        {success ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSignUpWithEmail} className="login-form">
            <label>
              <div className="label">{t("Correo electrónico")}</div>
              <input
                className="text"
                placeholder="you@company.com"
                type="email"
                required
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
                required
                onChange={(e) => setPassword(e.target.value)}
                value={password}
              />
            </label>

            <label>
              <div className="label">{t("Confirmar contraseña")}</div>
              <input
                className="text"
                placeholder="******"
                type="password"
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
              />
            </label>

            {message && (
              <div className="self-center text-destructive text-md">{message}</div>
            )}

            <button
              type="submit"
              className="primary w-full mt-[16px]"
            >
              {t("Crear cuenta")}
            </button>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {t("¿Ya tienes cuenta?")}{" "}
          <Link to="/login" className="text-primary underline">
            {t("Iniciar sesión")}
          </Link>
        </div>
      </div>
    </div>
  );
}
