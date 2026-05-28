import { supabase } from "@/supabase/client";
import useBoundStore from "@/stores/useBoundStore";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route } from "@/routes/__root";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to manage authentication state
 * Syncs Supabase auth session with the app's global store
 * Redirects to login when user logs out
 */
export function useAuth() {
  const setUser = useBoundStore((state) => state.ui.setUser);
  const setActiveOrg = useBoundStore((state) => state.ui.setActiveOrg);
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[useAuth] event:", event, "session:", session?.user?.email || null);

      // There is a SIGNED_IN event at tab focus. Checking if the user is
      // already logged in to avoid navigating to "/" or "/login".
      const loggedUser = useBoundStore.getState().ui.user;

      const user = session?.user ?? null;
      setUser(user);

      console.log("[useAuth] loggedUser:", loggedUser?.email || null, "user:", user?.email || null, "redirect:", redirect);

      // Signed in
      if (!loggedUser && user && event === "SIGNED_IN") {
        console.log("[useAuth] SIGNED_IN → navigating to:", redirect || "/");
        navigate({
          to: redirect || "/",
        });
      } else if (user && event === "SIGNED_IN") {
        console.log("[useAuth] SIGNED_IN but loggedUser already set, skipping navigate");
      }

      // Signed out
      if (
        loggedUser && !user && !window.location.pathname.startsWith("/login")
      ) {
        // Clear all queries and org state
        queryClient.clear();
        setActiveOrg(null);

        navigate({
          to: "/login",
          search: { redirect: window.location.pathname + window.location.hash },
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [redirect]);
}
