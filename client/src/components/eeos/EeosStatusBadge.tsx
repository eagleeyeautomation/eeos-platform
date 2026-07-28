import type { ComponentProps } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EeosStatus = "neutral" | "intelligence" | "healthy" | "warning" | "critical";

type EeosStatusBadgeProps = Omit<ComponentProps<typeof Badge>, "variant"> & {
  status?: EeosStatus;
  showIcon?: boolean;
};

const statusClasses: Record<EeosStatus, string> = {
  neutral: "border-[var(--border-primary)] bg-white/[0.04] text-[var(--text-secondary)]",
  intelligence: "border-[color:rgba(201,162,39,0.42)] bg-[color:rgba(201,162,39,0.1)] text-[var(--eeos-gold)]",
  healthy: "border-[color:rgba(16,185,129,0.42)] bg-[color:rgba(16,185,129,0.1)] text-[#6ee7b7]",
  warning: "border-[color:rgba(201,162,39,0.5)] bg-[color:rgba(201,162,39,0.1)] text-[#e4c75f]",
  critical: "border-[color:rgba(239,68,68,0.5)] bg-[color:rgba(239,68,68,0.1)] text-[#fca5a5]",
};

export function EeosStatusBadge({
  children,
  className,
  status = "neutral",
  showIcon = true,
  ...props
}: EeosStatusBadgeProps) {
  const Icon = status === "healthy"
    ? CheckCircle2
    : status === "critical" || status === "warning"
      ? AlertTriangle
      : Sparkles;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full px-3 py-1 font-semibold uppercase tracking-[0.12em]",
        statusClasses[status],
        className,
      )}
      {...props}
    >
      {showIcon ? <Icon aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
}
