import type { LucideIcon } from "lucide-react";

import { EeosSurface } from "@/components/eeos/EeosSurface";
import { cn } from "@/lib/utils";

type EeosMetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  status?: "neutral" | "healthy" | "critical";
  className?: string;
};

export function EeosMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  status = "neutral",
  className,
}: EeosMetricCardProps) {
  return (
    <EeosSurface className={cn("group p-5 transition duration-[var(--motion-standard)] hover:-translate-y-0.5 hover:border-[var(--border-active)]", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
          <p className={cn(
            "mt-2 text-sm text-[var(--text-muted)]",
            status === "healthy" && "text-[#6ee7b7]",
            status === "critical" && "text-[#fca5a5]",
          )}>
            {detail}
          </p>
        </div>
        <div className="rounded-lg border border-[color:rgba(201,162,39,0.38)] bg-[color:rgba(201,162,39,0.1)] p-2.5 text-[var(--eeos-gold)] transition group-hover:shadow-[0_0_22px_rgba(201,162,39,0.2)]">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
    </EeosSurface>
  );
}
