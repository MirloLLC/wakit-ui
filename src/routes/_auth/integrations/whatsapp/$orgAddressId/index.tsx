import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useOrganizationAddress } from "@/queries/useOrganizationsAddresses";
import { useWhatsAppDisconnect } from "@/queries/useWhatsAppSignup";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import type { OrganizationAddressExtra } from "@/supabase/client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import Button from "@/components/Button";
import SectionItem from "@/components/SectionItem";
import { LayoutTemplate, Webhook, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_auth/integrations/whatsapp/$orgAddressId/")({
  component: WhatsAppDetails,
});

function WhatsAppDetails() {
  const { orgAddressId } = Route.useParams();
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: integration } = useOrganizationAddress(orgAddressId);
  const disconnect = useWhatsAppDisconnect();
  const { data: agent } = useCurrentAgent();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!integration) return

  const isOwner = agent?.extra?.role === "owner";

  const extra = integration.extra as OrganizationAddressExtra | undefined;
  const flowType = extra?.flow_type;
  const isCoexistence = flowType === "existing_phone_number";

  const flowTypeLabels: Record<string, string> = {
    new_phone_number: "Cloud API",
    existing_phone_number: "Coexistence",
    only_waba: "Cloud API (WABA)",
  };

  const handleDisconnect = () => {
    if (isCoexistence) {
      setShowInstructions(true);
      return;
    }

    disconnect.mutate(
      { phone_number_id: integration.address },
      {
        onSuccess: () => {
          navigate({ to: "/integrations/whatsapp" });
        },
      }
    );
  };

  return (
    <>
      <SectionHeader title={integration.extra?.verified_name || t("Cuenta de WhatsApp")} />

      <SectionBody className="pb-[40px]">
        <SectionItem
          title={t("Plantillas de mensajes")}
          aside={
            <div className="p-[8px]">
              <LayoutTemplate className="w-[24px] h-[24px] text-muted-foreground" />
            </div>
          }
          onClick={() =>
            navigate({
              to: "/integrations/whatsapp/$orgAddressId/templates",
              params: { orgAddressId },
              hash: (prevHash) => prevHash!,
            })
          }
        />
        <form>
          <label>
            <div className="label">{t("Nombre verificado")}</div>
            <input
              type="text"
              className="text"
              value={extra?.verified_name || t("Sin nombre")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Número de teléfono")}</div>
            <input
              type="tel"
              className="text"
              value={formatPhoneNumber(extra?.phone_number || "")}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Tipo de integración")}</div>
            <input
              type="text"
              className="text"
              value={flowType ? flowTypeLabels[flowType] || flowType : ""}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("ID de número")}</div>
            <input
              type="text"
              className="text"
              value={integration.address}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("ID de WABA")}</div>
            <input
              type="text"
              className="text"
              value={integration.extra?.waba_id}
              readOnly
            />
          </label>

          <label>
            <div className="label">{t("Estado")}</div>
            <input
              type="text"
              className="text capitalize"
              value={integration.status === "connected" ? t("Conectado") : t("Desconectado")}
              readOnly
            />
          </label>

          {isCoexistence && (
            <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 text-[13px] p-3 rounded-lg">
              {t("Los grupos de WhatsApp no están disponibles en modo Coexistence. Para usar grupos, conecta un número con Cloud API.")}
            </div>
          )}
        </form>

        {/* Webhooks per address */}
        <AddressWebhooks orgAddressId={orgAddressId} />

        <form>
          {/* Disconnect button */}
          {integration.status === "connected" && !showInstructions && <Button
            type="button"
            className="primary bg-destructive text-primary-foreground hover:bg-destructive/80 px-4 py-2 rounded-full font-medium transition-colors w-fit text-[14px]"
            onClick={handleDisconnect}
            disabled={!isOwner}
            disabledReason={t("Requiere permisos de propietario")}
            loading={disconnect.isPending}
          >
            {t("Desconectar")}
          </Button>}

          {/* Coexistence disconnect instructions */}
          {showInstructions && (
            <div className="instructions">
              <p>{t("La cuenta debe ser desvinculada desde la aplicación móvil de WhatsApp Business:")}</p>
              <ol>
                <li>{t("Abrir la aplicación WhatsApp Business")}</li>
                <li>{t("Ir a Ajustes > Cuenta > Plataforma de negocio")}</li>
                <li>{t("Tocar la plataforma conectada y seleccionar \"Desconectar\"")}</li>
              </ol>
            </div>
          )}
        </form>
      </SectionBody>
    </>
  );
}

function AddressWebhooks({ orgAddressId }: { orgAddressId: string }) {
  const { translate: t } = useTranslation();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newTable, setNewTable] = useState("messages");
  const [saving, setSaving] = useState(false);

  const { data: webhooks } = useQuery({
    queryKey: ["address-webhooks", orgId, orgAddressId],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhooks")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("organization_address", orgAddressId)
        .order("created_at");
      return data || [];
    },
    enabled: !!orgId,
  });

  async function handleAdd() {
    if (!newUrl || !orgId) return;
    setSaving(true);
    await supabase.from("webhooks").insert({
      organization_id: orgId,
      organization_address: orgAddressId,
      table_name: newTable as "messages" | "conversations",
      operations: ["insert", "update"] as ("insert" | "update")[],
      url: newUrl,
      token: newToken || null,
    });
    queryClient.invalidateQueries({ queryKey: ["address-webhooks"] });
    setNewUrl("");
    setNewToken("");
    setShowAdd(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("webhooks").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["address-webhooks"] });
  }

  return (
    <div className="px-[10px] py-[16px]">
      <div className="flex items-center justify-between mb-[12px]">
        <div>
          <h3 className="text-[14px] font-semibold">{t("Webhooks")}</h3>
          <p className="text-[11px] text-muted-foreground">
            {t("Webhooks específicos para este número. Se suman a los de la organización.")}
          </p>
        </div>
        {!showAdd && (
          <button
            className="text-[12px] px-[10px] py-[5px] rounded-[6px] border border-border font-medium hover:bg-muted flex items-center gap-[4px]"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-[12px] h-[12px]" />
            {t("Agregar")}
          </button>
        )}
      </div>

      {(webhooks || []).map((wh) => (
        <div key={wh.id} className="flex items-center gap-[8px] p-[10px] mb-[6px] rounded-[8px] border border-border">
          <Webhook className="w-[16px] h-[16px] text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate">{wh.url}</p>
            <p className="text-[11px] text-muted-foreground">{wh.table_name} · {(wh.operations || []).join(", ")}</p>
          </div>
          <button
            className="p-[4px] hover:bg-destructive/10 rounded"
            onClick={() => handleDelete(wh.id)}
          >
            <Trash2 className="w-[14px] h-[14px] text-destructive" />
          </button>
        </div>
      ))}

      {(webhooks || []).length === 0 && !showAdd && (
        <p className="text-[12px] text-muted-foreground text-center py-[8px]">
          {t("Sin webhooks específicos para este número")}
        </p>
      )}

      {showAdd && (
        <div className="p-[12px] rounded-[8px] border border-border space-y-[10px]">
          <div>
            <div className="label">URL</div>
            <input
              className="text"
              placeholder="https://example.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Token ({t("opcional")})</div>
            <input
              className="text"
              placeholder="Bearer token"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
            />
          </div>
          <div>
            <div className="label">{t("Tabla")}</div>
            <select value={newTable} onChange={(e) => setNewTable(e.target.value)}>
              <option value="messages">Messages</option>
              <option value="conversations">Conversations</option>
            </select>
          </div>
          <div className="flex gap-[8px]">
            <button
              className="flex-1 py-[8px] rounded-[6px] border border-border text-[13px] font-medium hover:bg-muted"
              onClick={() => setShowAdd(false)}
            >
              {t("Cancelar")}
            </button>
            <button
              className="primary flex-1"
              onClick={handleAdd}
              disabled={!newUrl || saving}
            >
              {saving ? "..." : t("Guardar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
