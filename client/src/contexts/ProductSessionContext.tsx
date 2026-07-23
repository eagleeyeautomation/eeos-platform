import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ProductRole =
  | "PLATFORM_ADMIN"
  | "ORGANIZATION_OWNER"
  | "LOCATION_MANAGER"
  | "STAFF"
  | "READ_ONLY";

export type SessionContextValue = {
  loading: boolean;
  authenticated: boolean;
  user: {
    id: string;
    name?: string;
    email?: string;
  } | null;
  role: ProductRole | null;
  organization: {
    id: string;
    name: string;
  } | null;
  authorizedLocations: Array<{
    id: string;
    name: string;
  }>;
  ghlConnected: boolean;
};

const anonymousSession: SessionContextValue = {
  loading: true,
  authenticated: false,
  user: null,
  role: null,
  organization: null,
  authorizedLocations: [],
  ghlConnected: false,
};

const ProductSessionContext = createContext<SessionContextValue>(anonymousSession);

export function ProductSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionContextValue>(anonymousSession);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setSession((current) => ({ ...current, loading: true }));
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json();
        if (!cancelled) {
          setSession({ ...anonymousSession, ...payload, loading: false });
        }
      } catch {
        if (!cancelled) {
          setSession({ ...anonymousSession, loading: false });
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProductSessionContext.Provider value={session}>
      {children}
    </ProductSessionContext.Provider>
  );
}

export function useProductSession() {
  return useContext(ProductSessionContext);
}

export function getPostLoginRoute(role: ProductRole | null) {
  return role === "PLATFORM_ADMIN" ? "/admin" : "/executive-home";
}

export function isCustomerRole(role: ProductRole | null) {
  return role === "ORGANIZATION_OWNER"
    || role === "LOCATION_MANAGER"
    || role === "STAFF"
    || role === "READ_ONLY";
}
