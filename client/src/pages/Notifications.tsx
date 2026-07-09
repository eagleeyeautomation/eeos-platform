// EEOS Notification Center
// Categorized executive alerts, system notifications, and action items
// Sovereign Night design

import { useState } from "react";
import { Link } from "wouter";
import {
  Bell, CheckCircle2, AlertTriangle, XCircle, Brain,
  DollarSign, Users, Activity, Shield, Plug, Clock,
  ArrowRight, Eye, Zap, Filter, Check, Trash2,
  TrendingUp, Calendar, MessageSquare, RefreshCw
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const NOTIFICATIONS = [
  {
    id: "n1",
    type: "critical",
    category: "Revenue",
    title: "3 enterprise deals at risk — executive action required",
    body: "GoHighLevel pipeline shows 3 deals totaling $2.1M have been stalled 14+ days. Competitor activity detected in 2 accounts.",
    time: "2 min ago",
    read: false,
    actionLabel: "Review Deals",
    actionHref: "/demo",
    icon: DollarSign,
    color: "#EF4444",
    source: "GoHighLevel CRM",
  },
  {
    id: "n2",
    type: "warning",
    category: "Operations",
    title: "Staffing utilization below target — Southeast region",
    body: "Southeast region at 67% utilization vs. 82% target. 14 available placements unfilled this week.",
    time: "18 min ago",
    read: false,
    actionLabel: "View Report",
    actionHref: "/demo",
    icon: Users,
    color: "#F59E0B",
    source: "Workforce Management",
  },
  {
    id: "n3",
    type: "insight",
    category: "AI Recommendation",
    title: "Healthcare vertical showing 40% faster conversion",
    body: "Pattern analysis across 90 days shows healthcare clients convert significantly faster. 8 healthcare prospects in current pipeline.",
    time: "1 hr ago",
    read: false,
    actionLabel: "View Insight",
    actionHref: "/demo",
    icon: Brain,
    color: "#00D4C8",
    source: "EEOS Intelligence",
  },
  {
    id: "n4",
    type: "warning",
    category: "Finance",
    title: "3 invoices overdue — $187K outstanding",
    body: "Invoices #QB-8821 ($62.4K), #QB-8803 ($78.2K), and #QB-8791 ($46.4K) are 30+ days overdue. Automated reminders sent with no response.",
    time: "3 hr ago",
    read: false,
    actionLabel: "Escalate",
    actionHref: "/demo",
    icon: AlertTriangle,
    color: "#F59E0B",
    source: "QuickBooks Online",
  },
  {
    id: "n5",
    type: "system",
    category: "System",
    title: "API Gateway experiencing elevated latency",
    body: "API Gateway response times elevated to 890ms p95 since 07:42 AM. Investigation in progress. Core functions unaffected.",
    time: "32 min ago",
    read: true,
    actionLabel: "View Status",
    actionHref: "/system-health",
    icon: Activity,
    color: "#F59E0B",
    source: "EEOS Infrastructure",
  },
  {
    id: "n6",
    type: "success",
    category: "Revenue",
    title: "Deal #GHL-4821 closed — $420,000",
    body: "Enterprise deal with Meridian Health Group moved to Closed Won. Q3 revenue target now at 94% attainment.",
    time: "6 hr ago",
    read: true,
    actionLabel: "View Pipeline",
    actionHref: "/demo",
    icon: CheckCircle2,
    color: "#10B981",
    source: "GoHighLevel CRM",
  },
  {
    id: "n7",
    type: "insight",
    category: "AI Recommendation",
    title: "Q3 revenue forecast revised upward to $13.2M",
    body: "Based on current pipeline velocity and historical close rates, EEOS projects Q3 revenue of $13.2M — 8% above initial forecast.",
    time: "Yesterday",
    read: true,
    actionLabel: "View Forecast",
    actionHref: "/demo",
    icon: TrendingUp,
    color: "#00D4C8",
    source: "EEOS Intelligence",
  },
  {
    id: "n8",
    type: "system",
    category: "Integration",
    title: "Email Intelligence connector reconnected",
    body: "Authentication refresh completed. Email sync resumed. 847 messages queued for processing.",
    time: "Yesterday",
    read: true,
    actionLabel: "View Health",
    actionHref: "/integration-health",
    icon: Plug,
    color: "#10B981",
    source: "EEOS Infrastructure",
  },
];

const CATEGORIES = ["All", "Revenue", "Operations", "Finance", "AI Recommendation", "System", "Integration"];

const TYPE_CONFIG = {
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  insight: { color: "#00D4C8", bg: "rgba(0,212,200,0.08)", border: "rgba(0,212,200,0.2)" },
  success: { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  system: { color: "#E8EDF5", bg: "rgba(232,237,245,0.04)", border: "rgba(232,237,245,0.1)" },
};

export default function Notifications() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.read) return false;
    if (activeCategory !== "All" && n.category !== activeCategory) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="min-h-screen bg-[#050C1A]">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 pb-8 bg-[#050C1A] scan-grid">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="section-label mb-3">Notification Center</div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Executive Alerts
              </h1>
              <p className="text-sm text-[#E8EDF5]/50 mt-2">
                {unreadCount} unread · {notifications.length} total · All signals requiring your attention.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  showUnreadOnly
                    ? "bg-[rgba(0,212,200,0.1)] border-[rgba(0,212,200,0.3)] text-[#00D4C8]"
                    : "border-[rgba(0,212,200,0.15)] text-[#E8EDF5]/50 hover:text-[#00D4C8]"
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Filter className="w-3.5 h-3.5" />
                UNREAD ONLY
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[rgba(0,212,200,0.15)] text-[#E8EDF5]/50 hover:text-[#00D4C8] transition-all duration-200"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Check className="w-3.5 h-3.5" />
                  MARK ALL READ
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">

        {/* Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Critical", value: notifications.filter((n) => n.type === "critical").length, color: "#EF4444" },
            { label: "Warnings", value: notifications.filter((n) => n.type === "warning").length, color: "#F59E0B" },
            { label: "AI Insights", value: notifications.filter((n) => n.type === "insight").length, color: "#00D4C8" },
            { label: "Unread", value: unreadCount, color: "#E8EDF5" },
          ].map((s) => (
            <div key={s.label} className="metric-card rounded-xl p-4">
              <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.value}
              </div>
              <div className="text-[10px] text-[#E8EDF5]/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                activeCategory === cat
                  ? "bg-[rgba(0,212,200,0.12)] border border-[rgba(0,212,200,0.35)] text-[#00D4C8]"
                  : "border border-[rgba(0,212,200,0.1)] text-[#E8EDF5]/50 hover:text-[#E8EDF5]/80"
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[#E8EDF5]/30">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No notifications in this category.</p>
            </div>
          ) : (
            filtered.map((notif) => {
              const tc = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG];
              return (
                <div
                  key={notif.id}
                  className={`glass-card rounded-xl p-5 transition-all duration-250 hover:border-[rgba(0,212,200,0.25)] ${!notif.read ? "border-l-2" : ""}`}
                  style={!notif.read ? { borderLeftColor: tc.color } : {}}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: tc.bg, border: `1px solid ${tc.border}` }}
                    >
                      <notif.icon className="w-4 h-4" style={{ color: tc.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {notif.category.toUpperCase()}
                          </span>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4C8] inline-block" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-[#E8EDF5]/30" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {notif.time}
                          </span>
                          {!notif.read && (
                            <button
                              onClick={() => markRead(notif.id)}
                              className="p-1 rounded text-[#E8EDF5]/30 hover:text-[#00D4C8] transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-[#E8EDF5] mb-1 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-[#E8EDF5]/55 leading-relaxed mb-3">{notif.body}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#E8EDF5]/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          via {notif.source}
                        </span>
                        <Link
                          href={notif.actionHref}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D4C8] hover:text-[#00E8DB] transition-colors"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          onClick={() => markRead(notif.id)}
                        >
                          {notif.actionLabel}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[rgba(0,212,200,0.08)]">
          <Link
            href="/executive-home"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#050C1A] bg-[#00D4C8] rounded-lg hover:bg-[#00E8DB] active:scale-[0.97] transition-all duration-200 shadow-[0_0_20px_rgba(0,212,200,0.35)]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Eye className="w-4 h-4" />
            Open Executive Dashboard
          </Link>
          <Link
            href="/connect-ghl"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#00D4C8] border border-[rgba(0,212,200,0.35)] rounded-lg hover:bg-[rgba(0,212,200,0.08)] active:scale-[0.97] transition-all duration-200"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plug className="w-4 h-4" />
            Connect GoHighLevel
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
