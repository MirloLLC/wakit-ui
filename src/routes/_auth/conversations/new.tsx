import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useBoundStore from "@/stores/useBoundStore";
import { Search, X, MessageSquarePlus, MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { startConversation } from "@/utils/ConversationUtils";
import { useState } from "react";
import { formatPhoneNumber } from "@/utils/FormatUtils";
import SectionHeader from "@/components/SectionHeader";
import { useOrganizationsAddresses } from "@/queries/useOrganizationsAddresses";
import SectionItem from "@/components/SectionItem";
import SectionBody from "@/components/SectionBody";

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

  const [phoneNumber, setPhoneNumber] = useState("");

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

      <SectionBody>
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
      </SectionBody>
    </div>
  );
}
