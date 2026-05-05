import { useTranslation } from "@/hooks/useTranslation";
import { useProducts, useUsage, useTierLimits, usePlanProducts, useSubscription } from "@/queries/useBilling";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { ArrowUpRight } from "lucide-react";
import QuotaBar from "./QuotaBar";

const AI_CREDITS_BUDGET = 20;

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter — $25/mo",
  pro: "Pro — $249/mo",
};

function PlanCard() {
  const { translate: t } = useTranslation();
  const { data: subscription } = useSubscription();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const planId = subscription?.plan_id ?? "free";

  async function handleUpgrade(targetPlan: string) {
    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: {
        plan_id: targetPlan,
        organization_id: orgId,
        success_url: window.location.origin + "/stats/quotas",
        cancel_url: window.location.origin + "/stats/quotas",
      },
    });
    if (data?.url) window.location.href = data.url;
    if (error) console.error("Checkout error:", error);
  }

  async function handleManage() {
    const { data, error } = await supabase.functions.invoke("stripe-portal", {
      body: {
        organization_id: orgId,
        return_url: window.location.origin + "/stats/quotas",
      },
    });
    if (data?.url) window.location.href = data.url;
    if (error) console.error("Portal error:", error);
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-[16px]">
      <div>
        <p className="text-[12px] text-muted-foreground">{t("Plan actual")}</p>
        <p className="text-[16px] font-semibold">{PLAN_LABELS[planId] ?? planId}</p>
      </div>
      <div className="flex gap-[8px]">
        {planId !== "pro" && (
          <button
            className="primary text-[13px] py-[6px] px-[16px] flex items-center gap-[4px]"
            onClick={() => handleUpgrade(planId === "free" ? "starter" : "pro")}
          >
            {t("Mejorar plan")} <ArrowUpRight className="w-[14px] h-[14px]" />
          </button>
        )}
        {planId !== "free" && (
          <button
            className="text-[13px] py-[6px] px-[16px] border border-border rounded-full hover:bg-accent"
            onClick={handleManage}
          >
            {t("Gestionar")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function StatsQuotas() {
  const { translate: t } = useTranslation();
  const { data: products } = useProducts();
  const { data: monthUsage } = useUsage("month");
  const { data: lifetimeUsage } = useUsage("lifetime");
  const { data: tierLimits } = useTierLimits();
  const { data: planProducts } = usePlanProducts();

  const monthMap = new Map(monthUsage?.map((u) => [u.product_id, u.quantity]));
  const lifetimeMap = new Map(lifetimeUsage?.map((u) => [u.product_id, u.quantity]));
  const tierMap = new Map(
    tierLimits?.map((tl) => [tl.product_id, { cap: tl.cap, interval: tl.interval }]),
  );
  const planMap = new Map(
    planProducts?.map((pp) => [pp.product_id, { included: pp.included, interval: pp.interval }]),
  );

  const visibleProducts = products?.filter((p) => tierMap.has(p.id));

  return (
    <div className="flex flex-col gap-[16px] p-[24px] max-w-[600px] mx-auto w-full">
      <PlanCard />
      <h2 className="text-[20px] font-medium">{t("Cuotas")}</h2>
      {visibleProducts?.map((product) => {
        const tier = tierMap.get(product.id)!;
        const plan = planMap.get(product.id);
        const isLifetime = tier.interval === "lifetime";
        const used = isLifetime
          ? (lifetimeMap.get(product.id) ?? 0)
          : (monthMap.get(product.id) ?? 0);

        return (
          <QuotaBar
            key={product.id}
            productName={product.name}
            kind={product.kind}
            unit={product.unit}
            interval={tier.interval}
            used={used}
            included={plan?.included ?? null}
            cap={tier.cap}
            budget={product.kind === "balance" ? AI_CREDITS_BUDGET : undefined}
          />
        );
      })}
      {!visibleProducts?.length && (
        <div className="text-muted-foreground text-center py-[40px]">
          {t("Sin cuotas configuradas")}
        </div>
      )}
    </div>
  );
}
