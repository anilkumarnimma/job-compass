import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const tags = [
  // Job types
  "React Developer", "UI/UX Designer", "Product Manager", "Data Analyst",
  "DevOps", "Full Stack", "Mobile Developer", "AI Engineer",
  "Blockchain", "Cyber Security",
  // Locations
  "Hyderabad", "Bangalore", "Remote", "Mumbai", "Chennai", "Delhi", "Pune",
];

// Predefined scattered positions (percentage-based) around the hero center
// Avoid the center zone (30%-70% x, 25%-75% y) where CTA lives
const desktopPositions: { x: number; y: number }[] = [
  { x: 5, y: 12 }, { x: 82, y: 8 }, { x: 8, y: 78 }, { x: 85, y: 82 },
  { x: 2, y: 45 }, { x: 92, y: 45 }, { x: 18, y: 18 }, { x: 78, y: 20 },
  { x: 15, y: 85 }, { x: 80, y: 75 }, { x: 3, y: 65 }, { x: 93, y: 30 },
  { x: 22, y: 5 }, { x: 75, y: 90 }, { x: 10, y: 35 }, { x: 88, y: 60 },
  { x: 25, y: 92 },
];

// Each tag gets a unique drift animation
const driftKeyframes = [
  "floatDrift1", "floatDrift2", "floatDrift3", "floatDrift4", "floatDrift5",
];

interface TagState {
  offsetX: number;
  offsetY: number;
}

export function FloatingHeroTags() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const [tagStates, setTagStates] = useState<TagState[]>(
    () => tags.map(() => ({ offsetX: 0, offsetY: 0 }))
  );
  const rafRef = useRef<number>(0);

  const handleClick = useCallback((tag: string) => {
    navigate(`/dashboard?search=${encodeURIComponent(tag)}`);
  }, [navigate]);

  // Mouse repel effect (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);

    const animate = () => {
      const rect = container.getBoundingClientRect();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      setTagStates(prev =>
        prev.map((state, i) => {
          const pos = desktopPositions[i];
          if (!pos) return state;
          const tagX = (pos.x / 100) * rect.width;
          const tagY = (pos.y / 100) * rect.height;
          const dx = tagX - mx;
          const dy = tagY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 200;
          const strength = 35;

          let targetX = 0;
          let targetY = 0;

          if (dist < maxDist && dist > 0) {
            const force = ((maxDist - dist) / maxDist) * strength;
            targetX = (dx / dist) * force;
            targetY = (dy / dist) * force;
          }

          return {
            offsetX: state.offsetX + (targetX - state.offsetX) * 0.08,
            offsetY: state.offsetY + (targetY - state.offsetY) * 0.08,
          };
        })
      );

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile]);

  // Mobile: show limited tags as horizontal scroll
  if (isMobile) {
    const mobileTags = tags.slice(0, 8);
    return (
      <div className="w-full overflow-x-auto scrollbar-hide mt-6 -mb-2">
        <div className="flex gap-2 px-4 pb-2 w-max">
          {mobileTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleClick(tag)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-medium
                bg-card/60 backdrop-blur-sm border border-border/40
                text-foreground/80
                hover:border-accent hover:text-accent
                active:scale-95
                transition-all duration-200"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: floating scattered tags
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    >
      {tags.map((tag, i) => {
        const pos = desktopPositions[i];
        if (!pos) return null;
        const driftClass = driftKeyframes[i % driftKeyframes.length];
        const duration = 6 + (i % 5) * 2; // 6-14s
        const delay = -(i * 0.7);
        const state = tagStates[i];

        return (
          <button
            key={tag}
            onClick={() => handleClick(tag)}
            className="absolute pointer-events-auto
              px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap
              bg-[hsl(0_0%_100%/0.06)] dark:bg-[hsl(0_0%_100%/0.06)]
              bg-[hsl(0_0%_100%/0.8)] 
              dark:text-foreground/70 text-foreground/70
              border border-transparent
              backdrop-blur-md
              hover:border-accent hover:text-accent hover:scale-110
              hover:shadow-[0_0_16px_hsl(var(--accent)/0.3)]
              active:scale-95
              transition-[border,color,transform,box-shadow] duration-200 ease-out
              cursor-pointer select-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(${state.offsetX}px, ${state.offsetY}px)`,
              animation: `${driftClass} ${duration}s ease-in-out ${delay}s infinite`,
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
