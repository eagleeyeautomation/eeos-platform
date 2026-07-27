type AuthenticatedPageBrandingProps = {
  imageSrc: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export default function AuthenticatedPageBranding({
  imageSrc,
  title,
  subtitle,
  className = "",
}: AuthenticatedPageBrandingProps) {
  return (
    <figure
      className={`relative overflow-hidden rounded-2xl border border-[rgba(201,162,39,0.2)] bg-[linear-gradient(145deg,rgba(7,20,38,0.94),rgba(5,5,5,0.98))] shadow-[0_20px_70px_rgba(0,0,0,0.32)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(0,168,255,0.16),transparent_38%),radial-gradient(circle_at_20%_85%,rgba(201,162,39,0.12),transparent_36%)]" />
      <div className="relative grid min-h-48 gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(200px,38%)] sm:items-center sm:p-5">
        <figcaption className="order-2 sm:order-1">
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            EEOS Intelligence
          </p>
          <h2
            className="mt-2 text-xl font-semibold text-[#FFFFFF]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {title}
          </h2>
          {subtitle ? <p className="mt-2 max-w-xl text-sm leading-6 text-[#C0C7D1]/70">{subtitle}</p> : null}
        </figcaption>
        <div className="order-1 flex h-36 items-center justify-center sm:order-2 sm:h-40">
          <img
            src={imageSrc}
            alt={`${title} EEOS module artwork`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </figure>
  );
}
