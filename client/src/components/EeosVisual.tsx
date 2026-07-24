import type { CSSProperties } from "react";

type EeosVisualProps = {
  alt: string;
  src: string;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  loading?: "eager" | "lazy";
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
}: EeosVisualProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[rgba(201,162,39,0.2)] bg-[#050505] shadow-[0_24px_80px_rgba(0,0,0,0.34)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(0,168,255,0.18),transparent_34%),linear-gradient(135deg,rgba(201,162,39,0.14),transparent_38%,rgba(192,199,209,0.08))]" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`relative h-full w-full object-cover ${imageClassName}`}
        style={imageStyle}
      />
    </div>
  );
}
