import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useBoundStore from "@/stores/useBoundStore";
import { Search, X, MessageSquarePlus, MessageCircle, Phone, Users } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { startConversation } from "@/utils/ConversationUtils";
import { useState } from "react";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import SectionHeader from "@/components/SectionHeader";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import SectionItem from "@/components/SectionItem";
import SectionBody from "@/components/SectionBody";
import { supabase } from "@/supabase/client";
import type { OrganizationAddressExtra } from "@/supabase/client";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/_auth/conversations/new")({
  component: NewChat,
});

function NewChat() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: addresses } = useOrganizationsAddresses();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);

  const localAddress = addresses?.find(
    (address) => address.service === "local",
  );

  const whatsappAddresses = addresses?.filter(
    (address) => address.service === "whatsapp",
  );

  const [mode, setMode] = useState<"contact" | "group">("contact");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupResult, setGroupResult] = useState<{ invite_link?: string } | null>(null);
  const [selectedGroupAddress, setSelectedGroupAddress] = useState("");

  // Cloud API addresses support groups; Coexistence does not
  const cloudApiAddresses = whatsappAddresses?.filter(
    (a) => (a.extra as OrganizationAddressExtra)?.flow_type !== "existing_phone_number",
  );

  const createGroupMutation = useMutation({
    mutationFn: async ({ orgAddress }: { orgAddress: string }) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-management", {
        method: "POST",
        body: {
          organization_id: activeOrgId,
          organization_address: orgAddress,
          subject: groupName,
          ...(groupDescription && { description: groupDescription }),
        },
        headers: { "x-action": "groups" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setGroupResult(data),
  });

  function sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters, keep as-is
    return phone.replace(/\D/g, "");
  }

  function createConversation(orgAddress: string) {
    if (!activeOrgId) return;

    const convId = startConversation({
      organization_id: activeOrgId,
      organization_address: orgAddress,
      contact_address: sanitizePhoneNumber(phoneNumber),
      service: "whatsapp",
      name: formatPhoneNumber(sanitizePhoneNumber(phoneNumber)),
    });

    navigate({ to: "/conversations", hash: convId });
  }

  const showPhoneOptions = phoneNumber.replace(/\D/g, "").length >= 10 && !!whatsappAddresses?.length;

  return (
    <div className="flex flex-col h-full">
      <SectionHeader title={t("Nueva conversación")} />

      {/* Mode tabs — same style as ChatFilter */}
      {whatsappAddresses && whatsappAddresses.length > 0 && (
        <div className="px-[20px] pt-[8px] pb-[12px] flex gap-3">
          <button
            className={
              "text-[14px] px-[12px] py-[6px] rounded-full" +
              (mode === "contact"
                ? " text-foreground bg-primary/10 hover:bg-primary/20 border border-primary"
                : " text-foreground bg-background hover:bg-accent border border-border")
            }
            onClick={() => setMode("contact")}
          >
            {t("Contacto")}
          </button>
          <button
            className={
              "text-[14px] px-[12px] py-[6px] rounded-full" +
              (mode === "group"
                ? " text-foreground bg-primary/10 hover:bg-primary/20 border border-primary"
                : " text-foreground bg-background hover:bg-accent border border-border")
            }
            onClick={() => setMode("group")}
          >
            {t("Grupo")}
          </button>
        </div>
      )}

      {mode === "contact" && (
        <div className="px-[20px] pb-[12px] flex">
          <div className="flex items-center w-full bg-incoming-chat-bubble h-[40px] rounded-full hover:ring ring-border px-[12px] text-foreground">
            <Search className="text-muted-foreground w-[16px] h-[16px] stroke-[3px] shrink-0" />
            <input
              placeholder={t("Número con código de país (ej: 5215539875846)")}
              className="bg-transparent border-none outline-none w-full h-full text-[15px] mx-[12px] placeholder:text-muted-foreground"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            {phoneNumber && (
              <X
                className="cursor-pointer text-muted-foreground w-[16px] h-[16px] stroke-[3px]"
                onClick={() => setPhoneNumber("")}
              />
            )}
          </div>
        </div>
      )}

      {mode === "group" && (!cloudApiAddresses || cloudApiAddresses.length === 0) && (
        <SectionBody>
          <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 text-[13px] p-3 rounded-lg">
            {t("Los grupos de WhatsApp no están disponibles en modo Coexistence. Para usar grupos, conecta un número con Cloud API.")}
          </div>
        </SectionBody>
      )}

      {mode === "group" && cloudApiAddresses && cloudApiAddresses.length > 0 && (
        <SectionBody>
          <form className="flex flex-col gap-[12px]" onSubmit={(e) => {
            e.preventDefault();
            const addr = cloudApiAddresses.length === 1
              ? cloudApiAddresses[0].address
              : selectedGroupAddress;
            if (addr) createGroupMutation.mutate({ orgAddress: addr });
          }}>
            <label>
              <div className="label">{t("Nombre del grupo")}</div>
              <input
                type="text"
                className="text"
                placeholder={t("Ej: Soporte VIP")}
                maxLength={128}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </label>
            <label>
              <div className="label">{t("Descripción")} ({t("opcional")})</div>
              <input
                type="text"
                className="text"
                placeholder={t("Descripción del grupo")}
                maxLength={2048}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
              />
            </label>

            {cloudApiAddresses.length > 1 && (
              <label>
                <div className="label">{t("Crear desde")}</div>
                <select
                  className="text"
                  value={selectedGroupAddress}
                  onChange={(e) => setSelectedGroupAddress(e.target.value)}
                  required
                >
                  <option value="">{t("Seleccionar número")}</option>
                  {cloudApiAddresses.map((wa) => {
                    const name = (wa.extra as OrganizationAddressExtra)?.verified_name || "";
                    const phone = (wa.extra as OrganizationAddressExtra)?.phone_number || wa.address;
                    return (
                      <option key={wa.address} value={wa.address}>
                        {name} ({formatPhoneNumber(phone)})
                      </option>
                    );
                  })}
                </select>
              </label>
            )}

            {cloudApiAddresses.length === 1 && (
              <div className="text-[12px] text-muted-foreground">
                {t("Se creará desde")}: {(cloudApiAddresses[0].extra as OrganizationAddressExtra)?.verified_name || cloudApiAddresses[0].address}
              </div>
            )}

            {createGroupMutation.error && (
              <div className="text-[13px] text-destructive">
                {(createGroupMutation.error as Error).message}
              </div>
            )}

            {groupResult && (
              <div className="bg-primary/10 text-primary text-[13px] p-3 rounded-lg">
                {t("Grupo creado. Comparte el link de invitación con los participantes.")}
              </div>
            )}

            <button
              type="submit"
              className="primary w-full"
              disabled={!groupName.trim() || createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? t("Creando...") : t("Crear grupo")}
            </button>
          </form>
        </SectionBody>
      )}

      {mode === "contact" && <SectionBody>
        {localAddress && (
          <SectionItem
            title={t("Nueva conversación de prueba")}
            aside={
              <div className="p-[8px] bg-primary/10 rounded-full">
                <MessageSquarePlus className="w-[24px] h-[24px] text-primary" />
              </div>
            }
            onClick={() => {
              if (!activeOrgId) return;

              const convId = startConversation({
                name: t("Conversación de prueba"),
                organization_id: activeOrgId,
                organization_address: localAddress.address,
                service: "local",
              });

              navigate({ to: "/conversations", hash: convId });
            }}
          />
        )}

        {showPhoneOptions && whatsappAddresses.length === 1 && (
          <SectionItem
            title={formatPhoneNumber(sanitizePhoneNumber(phoneNumber))}
            aside={
              <div className="p-[8px] bg-primary/10 rounded-full">
                <MessageCircle className="w-[24px] h-[24px] text-primary" />
              </div>
            }
            onClick={() => createConversation(whatsappAddresses[0].address)}
          />
        )}

        {showPhoneOptions && whatsappAddresses.length > 1 && (
          <>
            <div className="px-[16px] py-[8px] text-[12px] text-muted-foreground uppercase tracking-wide">
              {t("Enviar desde")}
            </div>
            {whatsappAddresses.map((wa) => {
              const name = (wa.extra as Record<string, string>)?.verified_name || "";
              const phone = (wa.extra as Record<string, string>)?.phone_number || wa.address;
              return (
                <SectionItem
                  key={wa.address}
                  title={`${formatPhoneNumber(sanitizePhoneNumber(phoneNumber))}`}
                  description={`${name} (${formatPhoneNumber(phone)})`}
                  aside={
                    <div className="p-[8px]">
                      <Phone className="w-[20px] h-[20px] text-muted-foreground" />
                    </div>
                  }
                  onClick={() => createConversation(wa.address)}
                />
              );
            })}
          </>
        )}
      </SectionBody>}
    </div>
  );
}
