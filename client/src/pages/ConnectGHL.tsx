/**
 * EEOS — Connect GoHighLevel
 *
 * Mission Zero: Private Integration Token (PIT) flow
 * Validates EEOS against live PRN Staffers operations.
 *
 * Architecture:
 *   - Each Subaccount (GHL location) connects with its own Private Integration Token
 *   - Tokens are validated live against the GHL API before storage
 *   - After Mission Zero, this page will also offer the OAuth Marketplace App flow
 *
 * Engineering Principle: "Don't Build More. Build Accurate."
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  CheckCircle2, XCircle, Loader2, Lock, Eye, Database,
  Shield, AlertCircle, ChevronDown, ChevronUp, Plug,
  Building2, ArrowRight, RefreshCw, Key, ExternalLink,
  Info, Zap
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConnectionStatus = "idle" | "connecting" | "verifying" | "connected" | "error";

interface SubaccountEntry {
  /** Unique key for this entry */
  key: string;
  /** Human-readable name, e.g. "Delaware" */
  name: string;
  /** GHL Location ID */
  locationId: string;
  /** Private Integration Token */
  token: string;
  /** Current connection status */
  status: ConnectionStatus;
  /** Error message if status === "error" */
  error?: string;
  /** GHL location name returned by the API */
  ghlLocationName?: string;
  /** When this subaccount was connected */
  connectedAt?: string;
  /** Whether the form is expanded */
  expanded: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// How to get a Private Integration Token
// ─────────────────────────────────────────────────────────────────────────────

const PIT_INSTRUCTIONS = [
  {
    step: "01",
    title: "Open GoHighLevel",
    description: "Log in to your GoHighLevel account and navigate to the location (subaccount) you want to connect.",
  },
  {
    step: "02",
    title: "Go to Settings → Integrations",
    description: "In the left sidebar, click Settings, then click Integrations. Look for the \"Private Integrations\" section.",
  },
  {
    step: "03",
    title: "Create a Private Integration",
    description: "Click \"Add Private Integration\". Give it a name (e.g., \"EEOS\"). Select the permissions: Contacts, Opportunities, Calendars, Conversations, Locations.",
  },
  {
    step: "04",
    title: "Copy the Token",
    description: "After saving, copy the generated token. Paste it below along with the Location ID (found in Settings → Business Profile).",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SubaccountCard Component
// ─────────────────────────────────────────────────────────────────────────────

function SubaccountCard({
  entry,
  onChange,
  onConnect,
  onDisconnect,
  onVerify,
}: {
  entry: SubaccountEntry;
  onChange: (key: string, field: keyof SubaccountEntry, value: string | boolean) => void;
  onConnect: (key: string) => void;
  onDisconnect: (key: string) => void;
  onVerify: (key: string) => void;
}) {
  const isConnected = entry.status === "connected";
  const isLoading = entry.status === "connecting" || entry.status === "verifying";
  const hasError = entry.status === "error";

  const statusColor = isConnected ? "#10B981" : hasError ? "#EF4444" : "#E8EDF5";
  const statusLabel = isConnected ? "Connected" : hasError ? "Error" : entry.status === "connecting" ? "Connecting..." : entry.status === "verifying" ? "Verifying..." : "Not Connected";

  return (
    <div className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${
      isConnected ? "border-[rgba(16,185,129,0.3)]" : hasError ? "border-[rgba(239,68,68,0.2)]" : ""
    }`}>
      {/* Card Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => onChange(entry.key, "expanded", !entry.expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isConnected
              ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]"
              : hasError
              ? "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)]"
              : "bg-[rgba(0,212,200,0.06)] border-[rgba(0,212,200,0.15)]"
          }`}>
            <Building2 className="w-5 h-5" style={{ color: statusColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {entry.name || "New Subaccount"}
              </span>
              {isConnected && entry.ghlLocationName && entry.ghlLocationName !== entry.name && (
                <span className="text-[10px] text-[#10B981]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  → {entry.ghlLocationName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[#10B981] animate-pulse" : hasError ? "bg-[#EF4444]" : "bg-[rgba(255,255,255,0.2)]"}`} />
              <span className="text-[10px]" style={{ color: statusColor, fontFamily: "'JetBrains Mono', monospace" }}>
                {statusLabel}
              </span>
              {entry.locationId && (
                <span className="text-[10px] text-[#E8EDF5]/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  · {entry.locationId.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={(e) => { e.stopPropagation(); onVerify(entry.key); }}
              className="p-1.5 rounded-lg text-[#E8EDF5]/30 hover:text-[#00D4C8] transition-colors"
              title="Re-verify connection"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {entry.expanded ? (
            <ChevronUp className="w-4 h-4 text-[#E8EDF5]/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#E8EDF5]/30" />
          )}
        </div>
      </div>

      {/* Expanded Form */}
      {entry.expanded && (
        <div className="px-5 pb-5 border-t border-[rgba(0,212,200,0.06)]">
          <div className="pt-4 space-y-4">

            {/* Subaccount Name */}
            <div>
              <label className="block text-[10px] font-bold text-[#E8EDF5]/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Subaccount Name
              </label>
              <input
                type="text"
                value={entry.name}
                onChange={(e) => onChange(entry.key, "name", e.target.value)}
                placeholder="e.g. Delaware, South Carolina, Alabama, Florida"
                disabled={isConnected}
                className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(0,212,200,0.15)] text-[#E8EDF5] text-sm placeholder-[#E8EDF5]/25 focus:outline-none focus:border-[rgba(0,212,200,0.4)] transition-colors disabled:opacity-50"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>

            {/* GHL Location ID */}
            <div>
              <label className="block text-[10px] font-bold text-[#E8EDF5]/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                GHL Location ID
              </label>
              <input
                type="text"
                value={entry.locationId}
                onChange={(e) => onChange(entry.key, "locationId", e.target.value)}
                placeholder="e.g. abc123xyz..."
                disabled={isConnected}
                className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(0,212,200,0.15)] text-[#E8EDF5] text-sm placeholder-[#E8EDF5]/25 focus:outline-none focus:border-[rgba(0,212,200,0.4)] transition-colors disabled:opacity-50 font-mono"
              />
              <p className="text-[10px] text-[#E8EDF5]/30 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Found in GHL → Settings → Business Profile → Location ID
              </p>
            </div>

            {/* Private Integration Token */}
            <div>
              <label className="block text-[10px] font-bold text-[#E8EDF5]/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Private Integration Token
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#E8EDF5]/30" />
                <input
                  type="password"
                  value={entry.token}
                  onChange={(e) => onChange(entry.key, "token", e.target.value)}
                  placeholder="Paste your Private Integration Token here"
                  disabled={isConnected}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(0,212,200,0.15)] text-[#E8EDF5] text-sm placeholder-[#E8EDF5]/25 focus:outline-none focus:border-[rgba(0,212,200,0.4)] transition-colors disabled:opacity-50 font-mono"
                />
              </div>
              <p className="text-[10px] text-[#E8EDF5]/30 mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Found in GHL → Settings → Integrations → Private Integrations
              </p>
            </div>

            {/* Error message */}
            {hasError && entry.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <p className="text-xs text-[#EF4444]/80">{entry.error}</p>
              </div>
            )}

            {/* Connected success */}
            {isConnected && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#10B981]">Connected to GoHighLevel</p>
                  {entry.ghlLocationName && (
                    <p className="text-[10px] text-[#10B981]/70 mt-0.5">Location: {entry.ghlLocationName}</p>
                  )}
                  {entry.connectedAt && (
                    <p className="text-[10px] text-[#10B981]/50 mt-0.5">
                      Connected {new Date(entry.connectedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              {!isConnected ? (
                <button
                  onClick={() => onConnect(entry.key)}
                  disabled={isLoading || !entry.locationId.trim() || !entry.token.trim() || !entry.name.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(0,212,200,0.3)]"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plug className="w-4 h-4" />
                  )}
                  {entry.status === "connecting" ? "Connecting..." : entry.status === "verifying" ? "Verifying..." : "Connect Subaccount"}
                </button>
              ) : (
                <button
                  onClick={() => onDisconnect(entry.key)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#EF4444]/70 border border-[rgba(239,68,68,0.2)] rounded-lg hover:text-[#EF4444] hover:border-[rgba(239,68,68,0.4)] transition-all duration-200"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <XCircle className="w-4 h-4" />
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ConnectGHL() {
  const { user, isAuthenticated } = useAuth();
  const [showInstructions, setShowInstructions] = useState(false);

  // Subaccount entries — start with 4 for PRN Staffers' divisions
  const [subaccounts, setSubaccounts] = useState<SubaccountEntry[]>([
    { key: "delaware", name: "Delaware", locationId: "", token: "", status: "idle", expanded: true },
    { key: "south-carolina", name: "South Carolina", locationId: "", token: "", status: "idle", expanded: false },
    { key: "alabama", name: "Alabama", locationId: "", token: "", status: "idle", expanded: false },
    { key: "florida", name: "Florida", locationId: "", token: "", status: "idle", expanded: false },
  ]);

  const connectedCount = subaccounts.filter(s => s.status === "connected").length;
  const totalCount = subaccounts.length;

  const handleChange = (key: string, field: keyof SubaccountEntry, value: string | boolean) => {
    setSubaccounts(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
  };

  const handleConnect = async (key: string) => {
    const entry = subaccounts.find(s => s.key === key);
    if (!entry) return;

    setSubaccounts(prev => prev.map(s => s.key === key ? { ...s, status: "connecting", error: undefined } : s));

    try {
      const response = await fetch("/api/ghl/pit/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: entry.locationId.trim(),
          privateToken: entry.token.trim(),
          subaccountName: entry.name.trim(),
        }),
      });

      const data = await response.json() as {
        success: boolean;
        error?: string;
        locationName?: string;
        connectedAt?: string;
      };

      if (!data.success) {
        setSubaccounts(prev => prev.map(s =>
          s.key === key ? { ...s, status: "error", error: data.error ?? "Connection failed" } : s
        ));
        return;
      }

      setSubaccounts(prev => prev.map(s =>
        s.key === key ? {
          ...s,
          status: "connected",
          ghlLocationName: data.locationName,
          connectedAt: data.connectedAt,
          error: undefined,
        } : s
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error — check your connection";
      setSubaccounts(prev => prev.map(s => s.key === key ? { ...s, status: "error", error: message } : s));
    }
  };

  const handleDisconnect = async (key: string) => {
    const entry = subaccounts.find(s => s.key === key);
    if (!entry) return;

    try {
      await fetch("/api/ghl/pit/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: entry.locationId }),
      });
    } catch {
      // Ignore network errors on disconnect
    }

    setSubaccounts(prev => prev.map(s =>
      s.key === key ? { ...s, status: "idle", error: undefined, ghlLocationName: undefined, connectedAt: undefined } : s
    ));
  };

  const handleVerify = async (key: string) => {
    const entry = subaccounts.find(s => s.key === key);
    if (!entry) return;

    setSubaccounts(prev => prev.map(s => s.key === key ? { ...s, status: "verifying" } : s));

    try {
      const response = await fetch("/api/ghl/pit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: entry.locationId }),
      });

      const data = await response.json() as {
        success: boolean;
        valid: boolean;
        locationName?: string;
        connectedAt?: string;
        error?: string;
      };

      if (data.valid) {
        setSubaccounts(prev => prev.map(s =>
          s.key === key ? { ...s, status: "connected", ghlLocationName: data.locationName, error: undefined } : s
        ));
      } else {
        setSubaccounts(prev => prev.map(s =>
          s.key === key ? { ...s, status: "error", error: data.error ?? "Token is no longer valid" } : s
        ));
      }
    } catch {
      setSubaccounts(prev => prev.map(s => s.key === key ? { ...s, status: "error", error: "Verification failed" } : s));
    }
  };

  const addSubaccount = () => {
    const newKey = `subaccount-${Date.now()}`;
    setSubaccounts(prev => [
      ...prev,
      { key: newKey, name: "", locationId: "", token: "", status: "idle", expanded: true },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #00D4C8 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="section-label">GoHighLevel Integration</div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] font-semibold text-[#10B981]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  MISSION ZERO — PRIVATE INTEGRATION
                </span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Connect GoHighLevel
              <br />
              <span className="gradient-text">to the Intelligence Engine</span>
            </h1>
            <p className="text-[#E8EDF5]/60 text-sm leading-relaxed max-w-2xl">
              Connect each GoHighLevel subaccount using its Private Integration Token. The EEOS Intelligence Engine reads approved signals from each location and generates executive recommendations scoped to that operational division.
            </p>
          </div>

          {/* Progress */}
          {connectedCount > 0 && (
            <div className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="text-sm text-[#10B981]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {connectedCount} of {totalCount} subaccounts connected
              </span>
              {connectedCount === totalCount && (
                <span className="ml-auto text-xs text-[#10B981]/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Mission Zero complete ✓
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-8">

        {/* Auth Gate */}
        {!isAuthenticated && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Lock className="w-10 h-10 text-[#E8EDF5]/20 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[#E8EDF5] mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Sign in to connect GoHighLevel
            </h3>
            <p className="text-sm text-[#E8EDF5]/50 mb-5">
              Your Private Integration Tokens are stored securely and scoped to your EEOS account.
            </p>
            <button
              onClick={() => startLogin()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Zap className="w-4 h-4" />
              Sign In to Continue
            </button>
          </div>
        )}

        {/* Instructions Toggle */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between p-5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] flex items-center justify-center">
                <Info className="w-4 h-4 text-[#00D4C8]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  How to get a Private Integration Token
                </div>
                <div className="text-[10px] text-[#E8EDF5]/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Step-by-step instructions for each GHL location
                </div>
              </div>
            </div>
            {showInstructions ? (
              <ChevronUp className="w-4 h-4 text-[#E8EDF5]/30" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#E8EDF5]/30" />
            )}
          </button>

          {showInstructions && (
            <div className="px-5 pb-5 border-t border-[rgba(0,212,200,0.06)]">
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PIT_INSTRUCTIONS.map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-[#00D4C8]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.step}</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#E8EDF5] mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.title}</div>
                      <p className="text-[11px] text-[#E8EDF5]/50 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[rgba(0,212,200,0.06)] flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-[#00D4C8]" />
                <a
                  href="https://help.gohighlevel.com/support/solutions/articles/155000002166-private-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00D4C8] hover:text-[#00E8DB] transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  GHL Private Integrations Documentation →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Subaccount Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#E8EDF5]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                GoHighLevel Subaccounts
              </h2>
              <p className="text-[11px] text-[#E8EDF5]/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Each subaccount is an operational division with its own IE pipeline
              </p>
            </div>
            <button
              onClick={addSubaccount}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.2)] rounded-lg hover:bg-[rgba(0,212,200,0.06)] transition-all duration-200"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              + Add Subaccount
            </button>
          </div>

          <div className="space-y-4">
            {subaccounts.map((entry) => (
              <SubaccountCard
                key={entry.key}
                entry={entry}
                onChange={handleChange}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onVerify={handleVerify}
              />
            ))}
          </div>
        </div>

        {/* Security Note */}
        <div className="glass-card rounded-2xl p-5">
          <div className="section-label mb-3">Security & Privacy</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Lock, text: "Tokens are stored encrypted and never logged" },
              { icon: Eye, text: "EEOS reads signals only — never writes to GHL" },
              { icon: Shield, text: "Each token is scoped to one GHL location" },
              { icon: Database, text: "Signals are processed in real time, not bulk-copied" },
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[rgba(0,212,200,0.06)] border border-[rgba(0,212,200,0.12)] flex items-center justify-center shrink-0 mt-0.5">
                  <point.icon className="w-3 h-3 text-[#00D4C8]" />
                </div>
                <p className="text-xs text-[#E8EDF5]/55 leading-relaxed">{point.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        {connectedCount > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="section-label mb-4">Next Steps</div>
            <div className="space-y-3">
              <Link
                href="/executive-home"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[rgba(0,212,200,0.08)] border border-[rgba(0,212,200,0.2)] text-[#00D4C8] hover:bg-[rgba(0,212,200,0.12)] transition-all duration-200"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Open Executive Dashboard
                </span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Link>
              <Link
                href="/ai-recommendations"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/65 hover:text-[#E8EDF5]/90 hover:border-[rgba(0,212,200,0.2)] transition-all duration-200"
              >
                <Database className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  View IE Recommendations
                </span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-40" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
