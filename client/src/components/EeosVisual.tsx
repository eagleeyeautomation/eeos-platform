import type { CSSProperties } from "react";

type EeosVisualProps = {
  alt: string;
  src: string;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  loading?: "eager" | "lazy";
  fit?: "contain" | "cover";
};

export const EEOS_APP_IMAGES = {
  brainCloseup: "/eeos-assets/approved/eeos-eagle-brain-closeup.jpg",
  executiveIntelligence: "/eeos-assets/approved/eeos-executive-intelligence.jpg",
  officialLogoWide: "/eeos-assets/approved/eeos-logo-wide-official.png",
} as const;

export default function EeosVisual({
  alt,
  src,
  className = "",
  imageClassName = "",
  imageStyle,
  loading = "lazy",
  fit = "contain",
}: EeosVisualProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--eeos-black)] shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(201,162,39,0.12),transparent_34%),linear-gradient(135deg,rgba(201,162,39,0.1),transparent_38%,rgba(192,199,209,0.07))]" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`relative h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} ${imageClassName}`}
        style={imageStyle}
      />
    </div>
  );
}
