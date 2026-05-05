import { useTranslation } from "@/hooks/useTranslation";
import { LinkButton } from "@/components/LinkButton";
import { useCurrentOrganization } from "@/queries/useOrganizations";
import { MessageSquarePlus } from "lucide-react";

export default function Header() {
  const { data: org } = useCurrentOrganization();

  const { translate: t } = useTranslation();

  return (
    <div className="header flex justify-between w-full">
      <div className="flex items-center min-w-0">
        <div className="text-primary font-[800] text-[24px] truncate" style={{ letterSpacing: "-0.05em" }}>
          {org?.name || "wakit"}
        </div>
      </div>
      <div className="flex justify-end">
        <LinkButton
          to="/conversations/new"
          className="ml-[10px]"
          title={t("Nueva conversación")}
        >
          <MessageSquarePlus className="w-[24px] h-[24px] text-foreground" />
        </LinkButton>
      </div>
    </div>
  );
}
