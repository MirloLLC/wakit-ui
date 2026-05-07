import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { Plus, MessageSquareText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_auth/settings/quick-replies/")({
  component: QuickRepliesIndex,
});

function QuickRepliesIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const [search, setSearch] = useState("");

  const { data: replies, isLoading } = useQuery({
    queryKey: ["quick-replies", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("organization_id", orgId!)
        .order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  const filtered = (replies || []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
  });

  return (
    <>
      <SectionHeader title={t("Mensajes rápidos")} />

      <SectionBody>
        <SectionItem
          title={t("Agregar mensaje rápido")}
          aside={
            <div className="p-[8px] bg-primary/10 rounded-full">
              <Plus className="w-[24px] h-[24px] text-primary" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/settings/quick-replies/new",
              hash: (prevHash) => prevHash!,
            })
          }
        />

        <div className="px-[16px] py-[8px]">
          <input
            className="text"
            placeholder={t("Buscar mensajes rápidos...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && (
          <div className="text-center py-[32px] text-muted-foreground text-[14px]">
            {t("Cargando...")}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-[32px] text-muted-foreground text-[14px]">
            {t("Sin mensajes rápidos")}
          </div>
        )}

        {filtered.map((reply) => (
          <SectionItem
            key={reply.id}
            title={reply.name}
            description={reply.content.length > 80 ? reply.content.slice(0, 80) + "..." : reply.content}
            aside={
              <div className="p-[8px]">
                <MessageSquareText className="w-[24px] h-[24px] text-muted-foreground" />
              </div>
            }
            onClick={() =>
              navigate({
                to: `/settings/quick-replies/${reply.id}`,
                hash: (prevHash) => prevHash!,
              })
            }
          />
        ))}
      </SectionBody>
    </>
  );
}
