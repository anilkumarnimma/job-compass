import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function AnimatedCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();
  const pos = useRef({ x: 0, y: 0 });
  const trailPos = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    if (isMobile) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const onEnter = () => setIsVisible(true);
    const onLeave = () => setIsVisible(false);

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const interactive = el.closest("a, button, [role='button'], input, textarea, select, [data-interactive]");
      setIsHovering(!!interactive);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseleave", onLeave);

    const animate = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      // Trail follows with lerp
      trailPos.current.x += (pos.current.x - trailPos.current.x) * 0.15;
      trailPos.current.y += (pos.current.y - trailPos.current.y) * 0.15;
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${trailPos.current.x}px, ${trailPos.current.y}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [isMobile, isVisible]);

  if (isMobile) return null;

  return (
    <>
      {/* Main cursor dot */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 mix-blend-difference"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s, width 0.2s, height 0.2s",
          width: isHovering ? 28 : 6,
          height: isHovering ? 28 : 6,
          borderRadius: "50%",
          background: isHovering
            ? "hsl(var(--accent) / 0.2)"
            : "hsl(var(--accent))",
          boxShadow: isHovering
            ? "0 0 12px 3px hsl(var(--accent) / 0.2)"
            : "0 0 6px 1px hsl(var(--accent) / 0.3)",
        }}
      />
      {/* Trail */}
      <div
        ref={trailRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2"
        style={{
          opacity: isVisible ? 0.3 : 0,
          transition: "opacity 0.3s, width 0.3s, height 0.3s",
          width: isHovering ? 40 : 20,
          height: isHovering ? 40 : 20,
          borderRadius: "50%",
          border: "1px solid hsl(var(--accent) / 0.2)",
        }}
      />
      {/* Hide default cursor globally */}
      <style>{`
        *, *::before, *::after { cursor: none !important; }
      `}</style>
    </>
  );
}
