import { useEffect, useState, type ReactNode } from "react";
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

function AuthenticationBlocked({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
      <div className="glass-card max-w-lg rounded-2xl p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9A227]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Authentication Required
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[#FFFFFF]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          EEOS sign-in is required
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#FFFFFF]/60">{message}</p>
      </div>
    </div>
  );
}

export function OwnerRoute({ children, allowOnboarding = false }: { children: ReactNode; allowOnboarding?: boolean }) {
  const session = useProductSession();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.loading && !session.authenticated) {
      const started = startLogin();
      if (!started) {
        setAuthError("The EEOS sign-in page could not be opened.");
      }
    }
  }, [session.authenticated, session.loading]);

  if (session.loading) return <LoadingGate />;
  if (!session.authenticated && authError) return <AuthenticationBlocked message={authError} />;
  if (!session.authenticated) return <LoadingGate label="Redirecting to sign in" />;
  if (session.role === "PLATFORM_ADMIN") return <Redirect to="/access-denied" />;
  if (!isCustomerRole(session.role)) return <Redirect to="/access-denied" />;
  if (!allowOnboarding && (!session.organization || !session.ghlConnected)) return <Redirect to="/connect-ghl" />;

  return <>{children}</>;
}

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const session = useProductSession();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.loading && !session.authenticated) {
      const started = startLogin();
      if (!started) {
        setAuthError("The EEOS sign-in page could not be opened.");
      }
    }
  }, [session.authenticated, session.loading]);

  if (session.loading) return <LoadingGate />;
  if (!session.authenticated && authError) return <AuthenticationBlocked message={authError} />;
  if (!session.authenticated) return <LoadingGate label="Redirecting to sign in" />;
  if (session.role !== "PLATFORM_ADMIN") return <Redirect to="/access-denied" />;

  return <>{children}</>;
}
