import SectionHeader from "@/components/SectionHeader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_auth/settings/quick-replies/$replyId")({
  component: EditQuickReply,
});

function EditQuickReply() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { replyId } = Route.useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: reply } = useQuery({
    queryKey: ["quick-reply", replyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("id", replyId)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (reply) {
      setName(reply.name);
      setContent(reply.content);
    }
  }, [reply]);

  async function handleSave() {
    setSaving(true);
    await supabase.from("quick_replies").update({ name, content }).eq("id", replyId);
    queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
    setSaving(false);
    navigate({ to: "/settings/quick-replies", hash: (prev) => prev! });
  }

  async function handleDelete() {
    await supabase.from("quick_replies").delete().eq("id", replyId);
    queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
    navigate({ to: "/settings/quick-replies", hash: (prev) => prev! });
  }

  return (
    <>
      <SectionHeader title={t("Editar mensaje rápido")} />
      <div className="p-[24px] max-w-[600px]">
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <label>
            <div className="label">{t("Nombre")}</div>
            <input
              className="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            <div className="label">{t("Contenido")}</div>
            <textarea
              className="text min-h-[120px]"
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
          <button
            type="button"
            className="destructive w-full"
            onClick={handleDelete}
          >
            {t("Eliminar")}
          </button>
        </form>
      </div>
    </>
  );
}
