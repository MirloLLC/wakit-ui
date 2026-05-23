import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase/client";

interface PluginConfig {
  plugins: {
    stripe: boolean;
    "migrate-twilio": boolean;
    [key: string]: boolean;
  };
}

export function usePlugins() {
  const { data } = useQuery({
    queryKey: ["plugin-config"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("api/config");
      return (res.data as PluginConfig) || { plugins: {} };
    },
    staleTime: 1000 * 60 * 60, // cache 1 hour
    retry: false,
  });

  return {
    stripe: data?.plugins?.stripe ?? false,
    migrateTwilio: data?.plugins?.["migrate-twilio"] ?? false,
    isPlugin: (name: string) => data?.plugins?.[name] ?? false,
  };
}
