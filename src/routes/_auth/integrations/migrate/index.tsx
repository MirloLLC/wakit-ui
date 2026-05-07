import SectionBody from "@/components/SectionBody";
import SectionHeader from "@/components/SectionHeader";
import SectionItem from "@/components/SectionItem";
import { useTranslation } from "@/hooks/useTranslation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRightLeft } from "lucide-react";

export const Route = createFileRoute("/_auth/integrations/migrate/")({
  component: MigrateIndex,
});

function MigrateIndex() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <SectionHeader title={t("Migrar")} />
      <SectionBody>
        <SectionItem
          aside={
            <div className="p-[8px]">
              <ArrowRightLeft className="w-[24px] h-[24px] text-foreground" />
            </div>
          }
          title="Twilio"
          description={t("Migra tus números de WhatsApp desde Twilio")}
          onClick={() =>
            navigate({
              to: "/integrations/migrate/twilio",
              hash: (prevHash) => prevHash!,
            })
          }
        />
      </SectionBody>
    </>
  );
}
