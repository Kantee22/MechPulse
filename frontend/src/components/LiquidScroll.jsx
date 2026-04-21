/**
 * Vertical “landing kit” sections — mirrors CodePen Liquid Glass scroll rhythm.
 * Does not remove existing content; wraps blocks with spacing + optional headers.
 */

export function LiquidDivider() {
  return <hr className="liquid-divider" aria-hidden="true" />;
}

/** Hero block (full-width text, centred) — use `.liquid-hero__lead` on body copy */
export function LiquidHero({ kicker, title, children, className = "" }) {
  return (
    <header className={`liquid-hero ${className}`.trim()}>
      {kicker && <p className="liquid-hero__kicker">{kicker}</p>}
      {title && <h1 className="liquid-hero__title">{title}</h1>}
      {children}
    </header>
  );
}

/** Scroll section with optional kicker / title / subtitle (like kit “Glass Cards”) */
export function LiquidSection({ kicker, title, subtitle, children, className = "" }) {
  const hasHead = kicker || title || subtitle;
  return (
    <section className={`liquid-section ${className}`.trim()}>
      {hasHead && (
        <div className="liquid-section__head">
          {kicker && <span className="liquid-section__kicker">{kicker}</span>}
          {title && <h2 className="liquid-section__title">{title}</h2>}
          {subtitle && <span className="liquid-section__subtitle">{subtitle}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
