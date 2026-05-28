import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SectionHeader from "@/components/SectionHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrentAgent } from "@/queries/useAgents";
import { useForm } from "react-hook-form";
import SectionBody from "@/components/SectionBody";
import SectionFooter from "@/components/SectionFooter";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import useBoundStore from "@/stores/useBoundStore";
import { supabase } from "@/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/queries/queryKeys";
import { useState } from "react";

export const Route = createFileRoute("/_auth/settings/members/new")({
  component: AddMember,
});

interface InviteForm {
  name: string;
  email: string;
  role: string;
}

function AddMember() {
  const { translate: t } = useTranslation();
  const navigate = useNavigate();
  const { data: agent } = useCurrentAgent();
  const activeOrgId = useBoundStore((state) => state.ui.activeOrgId);
  const queryClient = useQueryClient();
  const isOwner = agent?.extra?.role === "owner";
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteForm) => {
      const { data: result, error } = await supabase.functions.invoke("invite", {
        body: {
          organization_id: activeOrgId,
          email: data.email,
          role: data.role,
        },
      });

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all(activeOrgId!) });
      setFeedback({
        type: "success",
        message: t("Invitación creada — el usuario la verá al iniciar sesión"),
      });
      setTimeout(() => {
        navigate({ to: "/settings/members", hash: (prev) => prev! });
      }, 2000);
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: (error as Error).message || t("Error al enviar la invitación"),
      });
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, isDirty },
  } = useForm<InviteForm>({
    defaultValues: {
      role: "member",
    },
  });

  return (
    <>
      <SectionHeader title={t("Agregar miembro")} />

      <SectionBody>
        <form
          id="create-member-form"
          onSubmit={handleSubmit((data) => {
            setFeedback(null);
            inviteMutation.mutate(data);
          })}
        >
          <fieldset disabled={!isOwner} className="contents">
            <p>
              {t("Los propietarios tienen control total, los administradores gestionan configuraciones y los miembros responden a las conversaciones.")}
            </p>

            <label>
              <div className="label">{t("Correo electrónico")}</div>
              <input
                type="email"
                className="text"
                placeholder={t("usuario@ejemplo.com")}
                {...register("email", {
                  required: true,
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
            </label>

            <SelectField
              name="role"
              control={control}
              label={t("Rol")}
              options={[
                { value: "member", label: t("Miembro") },
                { value: "admin", label: t("Administrador") },
                { value: "owner", label: t("Propietario") },
              ]}
              required
            />
          </fieldset>
        </form>
      </SectionBody>

      <SectionFooter>
        {feedback && (
          <div
            className={`w-full mb-[8px] p-[12px] rounded-[8px] text-[13px] ${
              feedback.type === "success"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.message}
          </div>
        )}
        <Button
          form="create-member-form"
          type="submit"
          disabled={!isOwner}
          invalid={!isValid || !isDirty}
          loading={inviteMutation.isPending}
          disabledReason={t("Requiere permisos de propietario")}
          className="primary"
        >
          {t("Invitar")}
        </Button>
      </SectionFooter>
    </>
  );
}
