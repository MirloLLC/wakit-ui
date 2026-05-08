import { createFileRoute } from "@tanstack/react-router";
import StatsUsage from "@/components/stats/StatsUsage";

export const Route = createFileRoute("/_auth/stats/usage")({
  component: StatsUsage,
});
