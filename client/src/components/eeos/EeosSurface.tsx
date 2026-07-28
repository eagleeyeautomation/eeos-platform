import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EeosSurfaceProps = ComponentProps<typeof Card> & {
  tone?: "operational" | "intelligence" | "critical";
};

export function EeosSurface({
  className,
  tone = "operational",
  ...props
}: EeosSurfaceProps) {
  return (
    <Card
      className={cn(
        "eeos-surface gap-0 rounded-xl py-0 text-[var(--text-primary)]",
        tone === "intelligence" && "eeos-surface--intelligence",
        tone === "critical" && "border-[color:rgba(239,68,68,0.48)]",
        className,
      )}
      {...props}
    />
  );
}
