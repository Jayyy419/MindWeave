import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type TourStep = {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
};

type Rect = { top: number; left: number; width: number; height: number };

const TOUR_SEEN_KEY = "mindweave-tour-seen";
const PADDING = 8;
const TOOLTIP_GAP = 12;

function hasSeenTour(): boolean {
  return localStorage.getItem(TOUR_SEEN_KEY) === "true";
}

function markTourSeen(): void {
  localStorage.setItem(TOUR_SEEN_KEY, "true");
}

function getRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

function bestPlacement(
  rect: Rect,
  preferred: TourStep["placement"]
): NonNullable<TourStep["placement"]> {
  if (preferred) return preferred;
  const vp = window.innerHeight;
  const belowSpace = vp - (rect.top - window.scrollY + rect.height);
  const aboveSpace = rect.top - window.scrollY;
  if (belowSpace > 220) return "bottom";
  if (aboveSpace > 220) return "top";
  return "bottom";
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
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const step = steps[current];

  const measure = useCallback(() => {
    if (!active || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = getRect(el);
    setTargetRect(rect);

    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active, step]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    const interval = setInterval(measure, 300);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  function finish() {
    markTourSeen();
    setActive(false);
    onComplete?.();
  }

  function next() {
    if (current < steps.length - 1) {
      setCurrent(current + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (current > 0) setCurrent(current - 1);
  }

  if (!active || !step) return null;

  const placement = targetRect ? bestPlacement(targetRect, step.placement) : "bottom";

  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: "absolute",
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + PADDING * 2,
        height: targetRect.height + PADDING * 2,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        pointerEvents: "none",
        zIndex: 9998,
        transition: "all 0.3s ease",
      }
    : {};

  let tooltipStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 9999,
    maxWidth: 360,
    transition: "all 0.3s ease",
  };

  if (targetRect) {
    switch (placement) {
      case "bottom":
        tooltipStyle.top = targetRect.top + targetRect.height + PADDING + TOOLTIP_GAP;
        tooltipStyle.left = targetRect.left + targetRect.width / 2;
        tooltipStyle.transform = "translateX(-50%)";
        break;
      case "top":
        tooltipStyle.top = targetRect.top - PADDING - TOOLTIP_GAP;
        tooltipStyle.left = targetRect.left + targetRect.width / 2;
        tooltipStyle.transform = "translate(-50%, -100%)";
        break;
      case "left":
        tooltipStyle.top = targetRect.top + targetRect.height / 2;
        tooltipStyle.left = targetRect.left - PADDING - TOOLTIP_GAP;
        tooltipStyle.transform = "translate(-100%, -50%)";
        break;
      case "right":
        tooltipStyle.top = targetRect.top + targetRect.height / 2;
        tooltipStyle.left = targetRect.left + targetRect.width + PADDING + TOOLTIP_GAP;
        tooltipStyle.transform = "translateY(-50%)";
        break;
    }
  } else {
    tooltipStyle.top = "50%";
    tooltipStyle.left = "50%";
    tooltipStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <>
      {/* Overlay that blocks interaction except with the tooltip */}
      <div
        className="fixed inset-0 z-[9997]"
        style={{ background: "transparent" }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight cutout */}
      {targetRect && <div style={spotlightStyle} />}

      {/* Tooltip */}
      <div ref={tooltipRef} style={tooltipStyle}>
        <div className="rounded-xl border border-purple-200 bg-white px-5 py-4 shadow-2xl">
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
          <p className="text-sm leading-relaxed text-stone-600">{step.description}</p>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
              >
                {current === steps.length - 1 ? "Finish" : "Next"}
                {current < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-3 flex justify-center gap-1.5">
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
