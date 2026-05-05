import { useTranslation } from "@/hooks/useTranslation";
import { useProducts, useUsage, useTierLimits, usePlanProducts, useSubscription } from "@/queries/useBilling";
import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { Check, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import QuotaBar from "./QuotaBar";

const AI_CREDITS_BUDGET = 20;

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    features: ["2,000 msgs/mo", "500 MB storage", "1 phone number", "1 organization"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$25",
    period: "/mo",
    features: ["50,000 msgs/mo", "5 GB storage", "5 phone numbers", "3 organizations", "Multi-tenant"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$249",
    period: "/mo",
    features: ["1,000,000 msgs/mo", "50 GB storage", "Unlimited phones", "Unlimited orgs", "Multi-tenant", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Custom volume", "Custom SLAs", "Dedicated Slack", "Priority features", "Custom integrations", "Onboarding support"],
  },
];

function PlanSelector() {
  const { translate: t } = useTranslation();
  const { data: subscription } = useSubscription();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const currentPlan = subscription?.plan_id ?? "free";
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(planId: string) {
    if (planId === currentPlan || planId === "free") return;
    setLoading(planId);
    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: {
        plan_id: planId,
        organization_id: orgId,
        success_url: window.location.origin + "/stats/quotas",
        cancel_url: window.location.origin + "/stats/quotas",
      },
    });
    if (data?.url) window.location.href = data.url;
    if (error) setLoading(null);
  }

  async function handleManage() {
    setLoading("manage");
    const { data, error } = await supabase.functions.invoke("stripe-portal", {
      body: {
        organization_id: orgId,
        return_url: window.location.origin + "/stats/quotas",
      },
    });
    if (data?.url) window.location.href = data.url;
    if (error) setLoading(null);
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px]">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const currentIdx = PLANS.findIndex((p) => p.id === currentPlan);
          const planIdx = PLANS.findIndex((p) => p.id === plan.id);
          const isUpgrade = planIdx > currentIdx && plan.id !== "enterprise";
          const isEnterprise = plan.id === "enterprise";

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-[14px] flex flex-col ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : isEnterprise
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-[14px] font-semibold">{plan.name}</span>
                {isCurrent && (
                  <span className="text-[10px] font-medium bg-primary text-primary-foreground rounded-full px-[8px] py-[2px]">
                    {t("Actual")}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-[2px] mb-[10px]">
                <span className="text-[24px] font-bold">{plan.price}</span>
                <span className={`text-[12px] ${isEnterprise ? "opacity-60" : "text-muted-foreground"}`}>{plan.period}</span>
              </div>
              <div className="flex flex-col gap-[6px] mb-[14px] flex-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-[6px]">
                    <Check className={`w-[12px] h-[12px] shrink-0 ${isEnterprise ? "opacity-60" : "text-foreground"}`} />
                    <span className={`text-[11px] ${isEnterprise ? "opacity-60" : "text-muted-foreground"}`}>{f}</span>
                  </div>
                ))}
              </div>
              {isUpgrade && (
                <button
                  className="primary text-[12px] py-[6px] w-full flex items-center justify-center gap-[4px]"
                  onClick={() => handleSelect(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? "..." : t("Seleccionar")}
                  {loading !== plan.id && <ArrowUpRight className="w-[12px] h-[12px]" />}
                </button>
              )}
              {isCurrent && plan.id !== "free" && (
                <button
                  className="text-[12px] py-[6px] w-full border border-border rounded-full hover:bg-accent"
                  onClick={handleManage}
                  disabled={loading !== null}
                >
                  {loading === "manage" ? "..." : t("Gestionar suscripción")}
                </button>
              )}
              {isEnterprise && (
                <a
                  href="mailto:rafa@mirlo.com"
                  className="text-[12px] py-[6px] w-full border border-background/30 rounded-full hover:bg-background/10 text-center"
                >
                  {t("Contactar ventas")}
                </a>
              )}
            </div>
          );
        })}
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
      <h2 className="text-[20px] font-medium">{t("Plan")}</h2>
      <PlanSelector />
      <h2 className="text-[20px] font-medium mt-[8px]">{t("Uso")}</h2>
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
          {t("Sin datos de uso")}
        </div>
      )}
    </div>
  );
}
