import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function useRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.role ?? null;
    },
  });
}

export function useIsMarketing() {
  return useRole().data === "marketing";
}
