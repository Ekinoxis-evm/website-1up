"use client";

// Pan / zoom canvas that replaces the old shrink-to-fit + dead-scroll wrapper.
// The g-loot library renders a self-contained SVG; we drop it inside a
// react-zoom-pan-pinch <TransformComponent> so users can drag and pinch freely
// instead of having to side-scroll a squashed tree.
//
//   • mode="interactive" (admin / regular): drag, wheel, pinch, double-click
//     zoom all on; freely pannable; floating zoom controls bottom-right.
//   • mode="display" (tv): gestures off, fit-only — purely programmatic.
//
// Fit-on-load + fit-on-resize is driven by zoomToElement(contentEl) on the
// ReactZoomPanPinchRef. A ~80ms post-mount timeout covers g-loot's async SVG
// render. A ResizeObserver on the viewport re-fits on layout changes
// (window resize, devtools, fullscreen open/close, tv poll re-mounts).

import React, { useCallback, useEffect, useRef } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

export type BracketViewportMode = "interactive" | "display";

const MIN_SCALE = 0.1;
const MAX_SCALE = 2.5;

export function BracketViewport({
  mode,
  children,
}: {
  mode: BracketViewportMode;
  children: React.ReactNode;
}) {
  const apiRef     = useRef<ReactZoomPanPinchRef | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);

  const interactive = mode === "interactive";

  const fit = useCallback(() => {
    const api = apiRef.current;
    const el  = contentRef.current;
    if (!api || !el) return;
    api.zoomToElement(el, undefined, 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(fit, 80);
    const wrap = wrapRef.current;
    let ro: ResizeObserver | undefined;
    if (wrap) {
      ro = new ResizeObserver(() => fit());
      ro.observe(wrap);
    }
    return () => {
      clearTimeout(t);
      ro?.disconnect();
    };
  }, [fit]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <TransformWrapper
        ref={(instance) => { apiRef.current = instance; }}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        limitToBounds={false}
        centerOnInit
        disabled={!interactive}
        wheel={{ disabled: !interactive }}
        pinch={{ disabled: !interactive }}
        panning={{ disabled: !interactive }}
        doubleClick={{ disabled: !interactive }}
        onInit={fit}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
            cursor: interactive ? "grab" : "default",
          }}
          contentStyle={{ width: "max-content", height: "max-content" }}
        >
          <div ref={contentRef}>{children}</div>
        </TransformComponent>

        {interactive && <ControlCluster onFit={fit} />}
      </TransformWrapper>
    </div>
  );
}

// Floating zoom controls — absolute bottom-right, 0px radius. Uses the
// library's useControls() for zoomIn/zoomOut/resetTransform; "fit" calls the
// parent's zoomToElement-based fit so it centers the whole tree.
function ControlCluster({ onFit }: { onFit: () => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col bg-surface-container">
      <ControlButton icon="add"        label="Acercar"          onClick={() => zoomIn()} />
      <ControlButton icon="remove"     label="Alejar"           onClick={() => zoomOut()} />
      <ControlButton icon="fit_screen" label="Ajustar"          onClick={onFit} />
      <ControlButton icon="restart_alt" label="Restablecer"     onClick={() => resetTransform()} />
    </div>
  );
}

function ControlButton({
  icon, label, onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center text-on-surface hover:bg-primary-container/20 transition-colors"
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </button>
  );
}
