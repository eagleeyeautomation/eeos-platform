import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

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
  const sessionQuery = trpc.auth.session.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const session = sessionQuery.data ?? {
    ...anonymousSession,
    loading: sessionQuery.isLoading,
  };

  return (
    <ProductSessionContext.Provider value={{ ...session, loading: sessionQuery.isLoading }}>
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
