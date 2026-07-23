import { useEffect, type ReactNode } from "react";
import { Redirect } from "wouter";
import { startLogin } from "@/const";
import { isCustomerRole, useProductSession } from "@/contexts/ProductSessionContext";

function LoadingGate({ label = "Loading EEOS session" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#C9A227]/30 border-t-[#C9A227] animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#FFFFFF]/60" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{label}</p>
      </div>
    </div>
  );
}

export function OwnerRoute({ children, allowOnboarding = false }: { children: ReactNode; allowOnboarding?: boolean }) {
  const session = useProductSession();

  useEffect(() => {
    if (!session.loading && !session.authenticated) {
      startLogin();
    }
  }, [session.authenticated, session.loading]);

  if (session.loading) return <LoadingGate />;
  if (!session.authenticated) return <LoadingGate label="Redirecting to sign in" />;
  if (session.role === "PLATFORM_ADMIN") return <Redirect to="/access-denied" />;
  if (!isCustomerRole(session.role)) return <Redirect to="/access-denied" />;
  if (!allowOnboarding && (!session.organization || !session.ghlConnected)) return <Redirect to="/connect-ghl" />;

  return <>{children}</>;
}

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const session = useProductSession();

  useEffect(() => {
    if (!session.loading && !session.authenticated) {
      startLogin();
    }
  }, [session.authenticated, session.loading]);

  if (session.loading) return <LoadingGate />;
  if (!session.authenticated) return <LoadingGate label="Redirecting to sign in" />;
  if (session.role !== "PLATFORM_ADMIN") return <Redirect to="/access-denied" />;

  return <>{children}</>;
}
