import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { GoogleOutlined, GithubOutlined } from "@ant-design/icons";
import useBoundStore from "@/stores/useBoundStore";

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
  const navigate = useNavigate();

  const { translate: t } = useTranslation();

  const user = useBoundStore((state) => state.ui.user);
  const [checking, setChecking] = useState(true);

  console.log("[signup] render", {
    hash: window.location.hash.substring(0, 50),
    user: user?.email || null,
    checking,
    invite,
    org,
  });

  useEffect(() => {
    console.log("[signup] effect fired, user:", user?.email || null);

    if (user) {
      console.log("[signup] user in store → navigating to /");
      navigate({ to: "/" });
      return;
    }

    console.log("[signup] no user in store, checking getSession()...");
    supabase.auth.getSession().then(({ data }) => {
      console.log("[signup] getSession result:", {
        hasSession: !!data.session,
        email: data.session?.user?.email || null,
      });
      if (data.session) {
        console.log("[signup] session exists → navigating to /");
        navigate({ to: "/" });
      } else {
        console.log("[signup] no session → showing form");
        setChecking(false);
      }
    });
  }, [user]);

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
            {t("Te invitaron a")} <strong>{decodeURIComponent(org)}</strong>.{" "}
            {checking ? t("Procesando invitación...") : t("Crea tu cuenta para unirte.")}
          </div>
        )}

        {checking ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {t("Procesando invitación...")}
          </div>
        ) : (
          <>
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
          </>
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
