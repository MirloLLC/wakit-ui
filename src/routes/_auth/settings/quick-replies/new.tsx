import SectionHeader from "@/components/SectionHeader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { useState } from "react";

export const Route = createFileRoute("/_auth/settings/quick-replies/new")({
  component: NewQuickReply,
});

function NewQuickReply() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name || !content || !orgId) return;
    setSaving(true);
    await supabase.from("quick_replies").insert({
      organization_id: orgId,
      name,
      content,
    });
    setSaving(false);
    navigate({ to: "/settings/quick-replies", hash: (prev) => prev! });
  }

  return (
    <>
      <SectionHeader title={t("Agregar mensaje rápido")} />
      <div className="p-[24px] max-w-[600px]">
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <label>
            <div className="label">{t("Nombre")}</div>
            <input
              className="text"
              placeholder={t("Nombre del mensaje rápido")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            <div className="label">{t("Contenido")}</div>
            <textarea
              className="text min-h-[120px]"
              placeholder={t("Contenido del mensaje...")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="primary w-full"
            disabled={!name || !content || saving}
          >
            {saving ? "..." : t("Guardar")}
          </button>
        </form>
      </div>
    </>
  );
}
