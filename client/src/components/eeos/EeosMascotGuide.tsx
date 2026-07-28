import type { ReactNode } from "react";

import EeosVisual, { EEOS_APP_IMAGES } from "@/components/EeosVisual";
import { EeosStatusBadge } from "@/components/eeos/EeosStatusBadge";
import { cn } from "@/lib/utils";

type MascotVariant =
  | "welcome"
  | "recommendation"
  | "assistant"
  | "status"
  | "empty"
  | "loading"
  | "success"
  | "warning"
  | "critical"
  | "compact";

type MascotStatus = "neutral" | "intelligence" | "healthy" | "critical";

export type EeosMascotGuideProps = {
  imageSrc?: string;
  alt?: string;
  title?: string;
  description?: string;
  variant?: MascotVariant;
  status?: MascotStatus;
  size?: "compact" | "standard";
  imagePosition?: "start" | "end";
  actions?: ReactNode;
  decorative?: boolean;
  className?: string;
};

export function EeosMascotGuide({
  imageSrc = EEOS_APP_IMAGES.brainCloseup,
  alt = "EEOS intelligence guide",
  title,
  description,
  variant = "assistant",
  status = "intelligence",
  size = "standard",
  imagePosition = "end",
  actions,
  decorative = false,
  className,
}: EeosMascotGuideProps) {
  const badgeStatus = status === "healthy"
    ? "healthy"
    : status === "critical"
      ? "critical"
      : status === "intelligence"
        ? "intelligence"
        : "neutral";

  return (
    <section
      aria-label={title || "EEOS intelligence guide"}
      className={cn(
        "eeos-surface eeos-surface--intelligence grid overflow-hidden rounded-xl md:grid-cols-[minmax(0,1fr)_minmax(220px,32%)]",
        imagePosition === "start" && "md:grid-cols-[minmax(220px,32%)_minmax(0,1fr)]",
        size === "compact" && "md:grid-cols-[minmax(0,1fr)_180px]",
        className,
      )}
    >
      <div className={cn("flex flex-col justify-center p-5 sm:p-6", imagePosition === "start" && "md:order-2")}>
        <EeosStatusBadge status={badgeStatus}>{variant === "welcome" ? "Executive intelligence online" : "EEOS intelligence"}</EeosStatusBadge>
        {title ? <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">{title}</h2> : null}
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}
        {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <EeosVisual
        src={imageSrc}
        alt={decorative ? "" : alt}
        loading={variant === "welcome" ? "eager" : "lazy"}
        className={cn(
          "min-h-48 rounded-none border-0 border-t border-[var(--border-primary)] shadow-none md:min-h-full md:border-l md:border-t-0",
          imagePosition === "start" && "md:order-1 md:border-l-0 md:border-r",
        )}
        imageClassName="object-contain object-center"
      />
    </section>
  );
}
