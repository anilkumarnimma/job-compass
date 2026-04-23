/**
 * PremiumBackground
 * Fixed full-screen panel-style background with subtle corner glows.
 * - Pure CSS (no images)
 * - Center stays clean & dark for readability
 * - Soft purple / blue / pink glows from corners + edges
 * - Vignette for focus
 * - Only renders the dark "panel" effect in dark mode
 */
export function PremiumBackground() {
  return (
    <div
      aria-hidden="true"
      className="premium-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="premium-bg__base" />
      <div className="premium-bg__glow premium-bg__glow--tl" />
      <div className="premium-bg__glow premium-bg__glow--tr" />
      <div className="premium-bg__glow premium-bg__glow--bl" />
      <div className="premium-bg__glow premium-bg__glow--br" />
      <div className="premium-bg__vignette" />
    </div>
  );
}
