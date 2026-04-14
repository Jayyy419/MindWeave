import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type TourStep = {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
};

/** Viewport-relative rect from getBoundingClientRect */
type VRect = { top: number; left: number; width: number; height: number };

const TOUR_SEEN_KEY = "mindweave-tour-seen";
const PAD = 6;
const GAP = 10;
const EDGE_MARGIN = 8;
const MOBILE_BP = 768;

function hasSeenTour(): boolean {
  return localStorage.getItem(TOUR_SEEN_KEY) === "true";
}
function markTourSeen(): void {
  localStorage.setItem(TOUR_SEEN_KEY, "true");
}

/** Resolve placement: on mobile force top/bottom only */
function resolvePlacement(
  rect: VRect,
  preferred: TourStep["placement"]
): "top" | "bottom" | "left" | "right" {
  const isMobile = window.innerWidth < MOBILE_BP;
  const vh = window.innerHeight;

  if (isMobile) {
    // Always top or bottom on mobile
    const below = vh - (rect.top + rect.height + PAD);
    const above = rect.top - PAD;
    if (below >= 180) return "bottom";
    if (above >= 180) return "top";
    return below >= above ? "bottom" : "top";
  }

  if (preferred) {
    // Validate preferred fits
    const below = vh - (rect.top + rect.height + PAD);
    const above = rect.top - PAD;
    const right = window.innerWidth - (rect.left + rect.width + PAD);
    const leftSpace = rect.left - PAD;

    switch (preferred) {
      case "bottom": if (below >= 160) return "bottom"; break;
      case "top": if (above >= 160) return "top"; break;
      case "right": if (right >= 280) return "right"; break;
      case "left": if (leftSpace >= 280) return "left"; break;
    }
  }

  // Auto: prefer bottom, then top
  const below = vh - (rect.top + rect.height + PAD);
  const above = rect.top - PAD;
  if (below >= 180) return "bottom";
  if (above >= 180) return "top";
  return below >= above ? "bottom" : "top";
}

/** Clamp a value so the tooltip (of given size) stays in viewport */
function clampX(x: number, tooltipW: number): number {
  const maxX = window.innerWidth - tooltipW - EDGE_MARGIN;
  return Math.max(EDGE_MARGIN, Math.min(x, maxX));
}
function clampY(y: number, tooltipH: number): number {
  const maxY = window.innerHeight - tooltipH - EDGE_MARGIN;
  return Math.max(EDGE_MARGIN, Math.min(y, maxY));
}

export function GuidedTour({
  steps,
  onComplete,
}: {
  steps: TourStep[];
  onComplete?: () => void;
}) {
  const [active, setActive] = useState(() => !hasSeenTour());
  const [current, setCurrent] = useState(0);
  const [rect, setRect] = useState<VRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  const step = steps[current];

  const measure = useCallback(() => {
    if (!active || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      setTooltipPos(null);
      return;
    }

    const r = el.getBoundingClientRect();
    const vr: VRect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setRect(vr);

    // Position tooltip after paint so we have its dimensions
    requestAnimationFrame(() => {
      const tip = tooltipRef.current;
      if (!tip) return;
      const tipRect = tip.getBoundingClientRect();
      const placement = resolvePlacement(vr, step.placement);

      let top = 0;
      let left = 0;

      switch (placement) {
        case "bottom":
          top = vr.top + vr.height + PAD + GAP;
          left = vr.left + vr.width / 2 - tipRect.width / 2;
          break;
        case "top":
          top = vr.top - PAD - GAP - tipRect.height;
          left = vr.left + vr.width / 2 - tipRect.width / 2;
          break;
        case "right":
          top = vr.top + vr.height / 2 - tipRect.height / 2;
          left = vr.left + vr.width + PAD + GAP;
          break;
        case "left":
          top = vr.top + vr.height / 2 - tipRect.height / 2;
          left = vr.left - PAD - GAP - tipRect.width;
          break;
      }

      setTooltipPos({
        top: clampY(top, tipRect.height),
        left: clampX(left, tipRect.width),
      });
    });
  }, [active, step]);

  // Scroll target into view, then measure
  useEffect(() => {
    if (!active || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      setTooltipPos(null);
      return;
    }

    scrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Wait for scroll to settle, then measure
    const timer = setTimeout(() => {
      scrollingRef.current = false;
      measure();
    }, 400);

    return () => clearTimeout(timer);
  }, [active, step, current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on scroll/resize (but not while we're scrolling to target)
  useEffect(() => {
    if (!active) return;

    let raf = 0;
    const onUpdate = () => {
      if (scrollingRef.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    // Handle mobile visual viewport resize (keyboard, address bar)
    window.visualViewport?.addEventListener("resize", onUpdate);
    window.visualViewport?.addEventListener("scroll", onUpdate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      window.visualViewport?.removeEventListener("resize", onUpdate);
      window.visualViewport?.removeEventListener("scroll", onUpdate);
    };
  }, [active, measure]);

  function finish() {
    markTourSeen();
    setActive(false);
    onComplete?.();
  }

  function next() {
    if (current < steps.length - 1) setCurrent(current + 1);
    else finish();
  }

  function prev() {
    if (current > 0) setCurrent(current - 1);
  }

  if (!active || !step) return null;

  // SVG overlay dimensions = full viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Spotlight cutout rect (viewport coords)
  const cx = rect ? rect.left - PAD : 0;
  const cy = rect ? rect.top - PAD : 0;
  const cw = rect ? rect.width + PAD * 2 : 0;
  const ch = rect ? rect.height + PAD * 2 : 0;
  const cr = 10; // border-radius for cutout

  return (
    <>
      {/* Full-screen fixed overlay with SVG cutout */}
      <svg
        className="fixed inset-0 z-[9997]"
        width={vw}
        height={vh}
        style={{ pointerEvents: "auto", touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <defs>
          <mask id="tour-mask">
            <rect width={vw} height={vh} fill="white" />
            {rect && (
              <rect
                x={cx}
                y={cy}
                width={cw}
                height={ch}
                rx={cr}
                ry={cr}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
          style={{ transition: "all 0.3s ease" }}
        />
        {/* Highlight border around cutout */}
        {rect && (
          <rect
            x={cx}
            y={cy}
            width={cw}
            height={ch}
            rx={cr}
            ry={cr}
            fill="none"
            stroke="rgba(147,51,234,0.5)"
            strokeWidth={2}
            style={{ transition: "all 0.3s ease" }}
          />
        )}
      </svg>

      {/* Tooltip – fixed position, clamped to viewport */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999]"
        style={{
          top: tooltipPos?.top ?? -9999,
          left: tooltipPos?.left ?? -9999,
          maxWidth: `min(360px, calc(100vw - ${EDGE_MARGIN * 2}px))`,
          transition: "top 0.3s ease, left 0.3s ease",
          visibility: tooltipPos ? "visible" : "hidden",
        }}
      >
        <div className="rounded-xl border border-purple-200 bg-white px-4 py-3.5 shadow-2xl sm:px-5 sm:py-4">
          {/* Header */}
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-purple-600">
                Step {current + 1} of {steps.length}
              </span>
              <h3 className="mt-0.5 text-sm font-bold text-stone-800">{step.title}</h3>
            </div>
            <button
              type="button"
              onClick={finish}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Skip tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <p className="text-[13px] leading-relaxed text-stone-600 sm:text-sm">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="mt-3 flex items-center justify-between sm:mt-4">
            <button
              type="button"
              onClick={finish}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {current > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 sm:px-3"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-700 sm:px-3"
              >
                {current === steps.length - 1 ? "Finish" : "Next"}
                {current < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-2.5 flex justify-center gap-1.5 sm:mt-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-4 bg-purple-600" : "w-1.5 bg-stone-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
