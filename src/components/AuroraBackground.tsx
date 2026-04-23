/**
 * AuroraBackground
 * Full-screen, fixed, behind-everything premium aurora mesh.
 * Pure CSS gradients (no images, no canvas) — GPU-friendly and very light.
 * Themed via index.css (.aurora-bg) so it adapts to light/dark modes.
 */
export function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div className="aurora-layer aurora-layer-1" />
      <div className="aurora-layer aurora-layer-2" />
      <div className="aurora-layer aurora-layer-3" />
      <div className="aurora-vignette" />
    </div>
  );
}
