import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import useBoundStore from "@/stores/useBoundStore";
import SectionHeader from "@/components/SectionHeader";
import { Check, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_auth/integrations/migrate/twilio")({
  component: MigrateTwilio,
});

type Step = "credentials" | "select" | "analysis" | "ready";

type Sender = {
  phone: string;
  name: string;
  sid: string;
  isWhatsApp?: boolean;
};

type NumberAnalysis = {
  phone: string;
  messages: {
    total: number;
    outbound: number;
    inbound: number;
    outbound_templates: number;
    outbound_freeform: number;
  };
  twilio_cost: {
    twilio_fee: { per_message: number; total: number };
    meta_fee: { templates: number; freeform: number; total: number };
    monthly_total: number;
  };
  wakit_cost: {
    plan: { name: string; price: number };
    wakit_fee: number;
    meta_fee: number;
    monthly_total: number;
  };
  savings: { monthly: number; percentage: number; note: string };
};

type AnalysisResult = {
  numbers: NumberAnalysis[];
  templates: { sid: string; name: string; types: string[]; body?: string }[];
  sender_webhooks: Record<string, { inbound_url: string | null; status_callback_url: string | null }>;
  total_savings: {
    twilio_monthly: number;
    wakit_monthly: number;
    saved_monthly: number;
    breakdown: {
      twilio_platform_fee: number;
      meta_fee_both: number;
      note: string;
    };
  };
};

function MigrateTwilio() {
  const { translate: t } = useTranslation();
  const orgId = useBoundStore((state) => state.ui.activeOrgId);
  const [step, setStep] = useState<Step>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Credentials
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");

  // Senders
  const [senders, setSenders] = useState<Sender[]>([]);
  const [accountName, setAccountName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [senderSids, setSenderSids] = useState<Record<string, string>>({});

  // Analysis
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "migrate-twilio/analyze",
        { body: { account_sid: accountSid, auth_token: authToken } }
      );
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setAccountName(data.account?.name || "Twilio Account");

      // Save SID map for Twilio Console links
      const sidMap: Record<string, string> = {};
      (data.senders || []).forEach((s: any) => { sidMap[s.phone] = s.sid; });
      setSenderSids(sidMap);

      // Only WhatsApp senders
      const whatsappNumbers = (data.senders || []).map((s: any) => ({
        phone: s.phone,
        name: s.name,
        sid: s.sid,
        isWhatsApp: true,
        status: s.status,
        quality: s.quality,
      }));

      setSenders(whatsappNumbers);
      setStep("select");
    } catch (err) {
      setError((err as Error).message || "Failed to connect to Twilio");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      const phones = [...selected];
      const { data, error: fnError } = await supabase.functions.invoke(
        "migrate-twilio/detail",
        {
          body: {
            account_sid: accountSid,
            auth_token: authToken,
            phone_numbers: phones,
          },
        }
      );
      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setAnalysis(data);
      setStep("analysis");
    } catch (err) {
      setError((err as Error).message || "Failed to analyze numbers");
    } finally {
      setLoading(false);
    }
  }

  function toggleNumber(phone: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  return (
    <>
      <SectionHeader title={t("Migrar desde Twilio")} />

      <div className="p-[24px] pb-[120px] max-w-[600px] mx-auto w-full overflow-y-auto">
        {error && (
          <div className="flex items-center gap-[8px] p-[12px] mb-[16px] rounded-[8px] border border-destructive/30 bg-destructive/5 text-destructive text-[13px]">
            <AlertCircle className="w-[16px] h-[16px] shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === "credentials" && (
          <div className="flex flex-col gap-[20px]">
            <p className="text-[14px] text-muted-foreground">
              {t("Ingresa tus credenciales de Twilio para analizar tu cuenta. Las encontras en")} {" "}
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                console.twilio.com
              </a>
            </p>

            <label>
              <div className="label">Account SID</div>
              <input
                className="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                type="text"
                value={accountSid}
                onChange={(e) => setAccountSid(e.target.value)}
              />
            </label>

            <label>
              <div className="label">Auth Token</div>
              <input
                className="text"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
            </label>

            <button
              className="primary w-full flex items-center justify-center gap-[8px]"
              onClick={handleConnect}
              disabled={!accountSid || !authToken || loading}
            >
              {loading ? (
                <Loader2 className="w-[16px] h-[16px] animate-spin" />
              ) : (
                <>
                  {t("Analizar cuenta")}
                  <ArrowRight className="w-[16px] h-[16px]" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Select numbers */}
        {step === "select" && (
          <div className="flex flex-col gap-[16px]">
            <div>
              <h3 className="text-[16px] font-semibold">{accountName}</h3>
              <p className="text-[13px] text-muted-foreground">
                {t("Selecciona los números de WhatsApp que quieres migrar")} ({senders.length} {t("números")})
              </p>
            </div>

            <input
              className="text"
              placeholder={t("Buscar por número o nombre...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {senders.length === 0 ? (
              <p className="text-[14px] text-muted-foreground text-center py-[32px]">
                {t("No se encontraron números en esta cuenta")}
              </p>
            ) : (
              <div className="flex flex-col gap-[8px] max-h-[400px] overflow-y-auto">
                {senders
                  .filter((s) => {
                    if (!search) return true;
                    const q = search.toLowerCase();
                    return s.phone.includes(q) || (s.name || "").toLowerCase().includes(q);
                  })
                  .map((sender) => (
                  <div
                    key={sender.phone}
                    className={`flex items-center gap-[12px] p-[12px] rounded-[10px] border cursor-pointer transition-colors ${
                      selected.has(sender.phone)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => toggleNumber(sender.phone)}
                  >
                    <div
                      className={`w-[20px] h-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 ${
                        selected.has(sender.phone)
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selected.has(sender.phone) && (
                        <Check className="w-[12px] h-[12px] text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[6px]">
                        <p className="text-[14px] font-medium truncate">{sender.name}</p>
                        <span className={`text-[10px] px-[6px] py-[1px] rounded-[4px] font-medium shrink-0 ${
                          (sender as any).status === "ONLINE"
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {(sender as any).status || "WhatsApp"}
                        </span>
                        {(sender as any).quality && (
                          <span className="text-[10px] px-[6px] py-[1px] rounded-[4px] bg-muted text-muted-foreground shrink-0">
                            {(sender as any).quality}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground">{sender.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-[8px]">
              <button
                className="flex-1 py-[10px] rounded-[8px] border border-border text-[14px] font-medium hover:bg-muted"
                onClick={() => setStep("credentials")}
              >
                {t("Volver")}
              </button>
              <button
                className="primary flex-1 flex items-center justify-center gap-[8px]"
                onClick={handleAnalyze}
                disabled={selected.size === 0 || loading}
              >
                {loading ? (
                  <Loader2 className="w-[16px] h-[16px] animate-spin" />
                ) : (
                  <>
                    {t("Analizar")} ({selected.size})
                    <ArrowRight className="w-[16px] h-[16px]" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Analysis results */}
        {step === "analysis" && analysis && (
          <div className="flex flex-col gap-[20px]">
            <div>
              <h3 className="text-[16px] font-semibold">{t("Análisis de migración")}</h3>
              <p className="text-[13px] text-muted-foreground">
                {t("Últimos 30 días de actividad")}
              </p>
            </div>

            {/* Per-number breakdown */}
            {analysis.numbers.map((num) => (
              <div
                key={num.phone}
                className="rounded-[10px] border border-border p-[16px]"
              >
                <p className="text-[14px] font-semibold mb-[8px]">{num.phone}</p>
                <div className="grid grid-cols-2 gap-[8px] text-[13px]">
                  <div>
                    <span className="text-muted-foreground">{t("Mensajes entrantes")}</span>
                    <p className="font-medium">{(num.messages?.inbound ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Mensajes salientes")}</span>
                    <p className="font-medium">{(num.messages?.outbound ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Templates")}</span>
                    <p className="font-medium">{(num.messages?.outbound_templates ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Free-form")}</span>
                    <p className="font-medium">{(num.messages?.outbound_freeform ?? 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-[12px] pt-[12px] border-t border-border grid grid-cols-2 gap-[8px] text-[13px]">
                  <div>
                    <span className="text-muted-foreground">Twilio fee ($0.005/msg)</span>
                    <p className="font-medium">${num.twilio_cost.twilio_fee.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Meta fee ({t("igual en ambos")})</span>
                    <p className="font-medium">${num.twilio_cost.meta_fee.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Total Twilio/mes")}</span>
                    <p className="font-medium text-destructive">${num.twilio_cost.monthly_total.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Total wakit/mes")}</span>
                    <p className="font-medium text-primary">
                      ${num.wakit_cost.monthly_total.toFixed(2)} ({num.wakit_cost.plan.name})
                    </p>
                  </div>
                </div>

                {num.savings.monthly > 0 && (
                  <div className="mt-[8px] p-[8px] rounded-[6px] bg-primary/5 text-[12px]">
                    {t("Ahorro")}: <strong>${num.savings.monthly.toFixed(2)}/mes</strong> ({num.savings.percentage}%)
                  </div>
                )}
              </div>
            ))}

            {/* Total savings */}
            <div className="rounded-[10px] border border-foreground bg-foreground text-background p-[16px]">
              <div className="grid grid-cols-3 gap-[12px] text-center">
                <div>
                  <p className="text-[11px] opacity-60 uppercase tracking-wide">{t("Twilio/mes")}</p>
                  <p className="text-[20px] font-bold">
                    ${analysis.total_savings.twilio_monthly.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] opacity-60 uppercase tracking-wide">{t("wakit/mes")}</p>
                  <p className="text-[20px] font-bold">
                    ${analysis.total_savings.wakit_monthly}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] opacity-60 uppercase tracking-wide">{t("Ahorro/mes")}</p>
                  <p className="text-[20px] font-bold">
                    ${analysis.total_savings.saved_monthly.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook config per number */}
            {Object.keys(analysis.sender_webhooks || {}).length > 0 && (
              <div className="mt-[8px]">
                <h4 className="text-[14px] font-semibold mb-[8px]">
                  {t("Configuración de webhooks en Twilio")}
                </h4>
                {Object.entries(analysis.sender_webhooks).map(([phone, wh]) => (
                  <div key={phone} className="rounded-[8px] border border-border p-[12px] mb-[8px]">
                    <p className="text-[13px] font-medium mb-[6px]">{phone}</p>
                    <div className="text-[12px] text-muted-foreground space-y-[4px]">
                      {wh.inbound_url && (
                        <div>
                          <span className="font-medium text-foreground">{t("Mensajes entrantes")}:</span>{" "}
                          <code className="text-[11px] bg-muted px-[4px] py-[1px] rounded break-all">{wh.inbound_url}</code>
                        </div>
                      )}
                      {wh.status_callback_url && (
                        <div>
                          <span className="font-medium text-foreground">{t("Status callback")}:</span>{" "}
                          <code className="text-[11px] bg-muted px-[4px] py-[1px] rounded break-all">{wh.status_callback_url}</code>
                        </div>
                      )}
                      {!wh.inbound_url && !wh.status_callback_url && (
                        <span>{t("Sin webhooks configurados")}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-[8px] mt-[8px]">
                  <button
                    className="text-[12px] px-[12px] py-[5px] rounded-[6px] border border-border font-medium hover:bg-muted flex items-center gap-[4px]"
                    onClick={() => {
                      const config = Object.entries(analysis.sender_webhooks).map(([phone, wh]) => ({
                        phone,
                        inbound_url: wh.inbound_url,
                        status_callback_url: wh.status_callback_url,
                        wakit_table: "messages",
                        wakit_operations: ["insert", "update"],
                      }));
                      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                    }}
                  >
                    {t("Copiar configuración")}
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {t("Una vez conectado el número, usa esta configuración para crear los webhooks en wakit.")}
                  </span>
                </div>
              </div>
            )}

            {/* Templates */}
            {analysis.templates.length > 0 && (
              <div className="mt-[8px]">
                <div className="flex items-center justify-between mb-[8px]">
                  <h4 className="text-[14px] font-semibold">
                    {t("Templates de Twilio")} ({analysis.templates.length})
                  </h4>
                  {!importResult && (
                    <button
                      className="text-[12px] px-[12px] py-[5px] rounded-[6px] border border-border font-medium hover:bg-muted flex items-center gap-[4px]"
                      onClick={async () => {
                        setImportLoading(true);
                        try {
                          const { data, error: fnErr } = await supabase.functions.invoke(
                            "migrate-twilio/import-templates",
                            {
                              body: {
                                account_sid: accountSid,
                                auth_token: authToken,
                                organization_id: orgId || "",
                              },
                            }
                          );
                          if (fnErr) throw fnErr;
                          setImportResult(data);
                        } catch {
                          setError("Error al importar templates");
                        } finally {
                          setImportLoading(false);
                        }
                      }}
                      disabled={importLoading}
                    >
                      {importLoading ? (
                        <Loader2 className="w-[12px] h-[12px] animate-spin" />
                      ) : (
                        t("Importar como mensajes rápidos")
                      )}
                    </button>
                  )}
                  {importResult && (
                    <span className="text-[12px] text-muted-foreground">
                      {importResult.imported} {t("importados")}, {importResult.skipped} {t("omitidos")}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mb-[8px]">
                  {t("Los templates de Meta migran automáticamente con el número. Los de Twilio se importan como mensajes rápidos.")}
                </p>
                <div className="flex flex-wrap gap-[6px]">
                  {analysis.templates.slice(0, 10).map((tmpl) => (
                    <span
                      key={tmpl.sid}
                      className="text-[11px] px-[8px] py-[3px] rounded-[4px] bg-muted text-muted-foreground"
                      title={tmpl.body || ""}
                    >
                      {tmpl.name}
                    </span>
                  ))}
                  {analysis.templates.length > 10 && (
                    <span className="text-[11px] px-[8px] py-[3px] rounded-[4px] bg-muted text-muted-foreground">
                      +{analysis.templates.length - 10} {t("más")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-[8px] mt-[8px]">
              <button
                className="flex-1 py-[10px] rounded-[8px] border border-border text-[14px] font-medium hover:bg-muted"
                onClick={() => setStep("select")}
              >
                {t("Volver")}
              </button>
              <button
                className="primary flex-1 flex items-center justify-center gap-[8px]"
                onClick={() => setStep("ready")}
              >
                {t("Próximos pasos")}
                <ArrowRight className="w-[16px] h-[16px]" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Next steps */}
        {step === "ready" && analysis && (
          <div className="flex flex-col gap-[20px]">
            <div>
              <h3 className="text-[16px] font-semibold">{t("Próximos pasos")}</h3>
              <p className="text-[13px] text-muted-foreground">
                {t("Para cada número que quieras migrar, seguí estos pasos en orden.")}
              </p>
            </div>

            {analysis.numbers.map((num) => (
              <div key={num.phone} className="rounded-[10px] border border-border p-[16px]">
                <p className="text-[14px] font-semibold mb-[12px]">{num.phone}</p>

                <div className="flex flex-col gap-[12px]">
                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">1</div>
                    <div>
                      <p className="text-[13px] font-medium">{t("Desconectar de Twilio")}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {t("Ir a")} <a href={`https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders/details/${senderSids[num.phone] || ""}`} target="_blank" rel="noopener noreferrer" className="underline">Twilio Console → {num.phone}</a> {t("y eliminar este número.")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">2</div>
                    <div>
                      <p className="text-[13px] font-medium">{t("Esperar 3 minutos")}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {t("Meta necesita unos minutos para liberar el número después de desconectarlo.")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">3</div>
                    <div>
                      <p className="text-[13px] font-medium">{t("Conectar en wakit")}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {t("Usar 'Conectar número' en la sección de WhatsApp y completar el flujo de Embedded Signup con este número.")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-[10px]">
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">4</div>
                    <div>
                      <p className="text-[13px] font-medium">{t("Configurar webhooks")}</p>
                      {analysis?.sender_webhooks?.[num.phone]?.inbound_url ? (
                        <div className="text-[12px] text-muted-foreground space-y-[6px]">
                          <p>{t("Tu webhook actual en Twilio")}:</p>
                          <div className="flex items-center gap-[6px]">
                            <code className="text-[11px] bg-muted px-[4px] py-[1px] rounded break-all flex-1">
                              {analysis.sender_webhooks[num.phone].inbound_url}
                            </code>
                            <button
                              className="text-[11px] px-[8px] py-[3px] rounded-[4px] border border-border hover:bg-muted shrink-0"
                              onClick={() => navigator.clipboard.writeText(analysis.sender_webhooks[num.phone].inbound_url!)}
                            >
                              {t("Copiar")}
                            </button>
                          </div>
                          <p className="text-[11px]">
                            {t("Una vez conectado el número en wakit, agrega este webhook desde el detalle del número → Webhooks → Agregar.")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">
                          {t("Este número no tiene webhooks configurados en Twilio.")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-[8px]">
              <button
                className="flex-1 py-[10px] rounded-[8px] border border-border text-[14px] font-medium hover:bg-muted"
                onClick={() => setStep("analysis")}
              >
                {t("Volver")}
              </button>
              <button
                className="primary flex-1 flex items-center justify-center gap-[8px]"
                onClick={() => window.location.href = "/integrations/whatsapp/new"}
              >
                {t("Ir a conectar número")}
                <ArrowRight className="w-[16px] h-[16px]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
