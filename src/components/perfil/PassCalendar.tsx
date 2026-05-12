"use client";

import { useMemo } from "react";
import type { PassOrder } from "@/types/database.types";

const DAYS_ES = ["D", "L", "M", "M", "J", "V", "S"];
const MONTHS_ES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function localDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey(): string {
  const d = new Date();
  return localDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildCoveredSet(orders: PassOrder[]): Set<string> {
  const covered = new Set<string>();
  for (const order of orders) {
    if (order.status !== "confirmed" || !order.expires_at || !order.paid_at) continue;
    const start = new Date(order.paid_at);
    start.setHours(0, 0, 0, 0);
    const end = new Date(order.expires_at);
    end.setHours(23, 59, 59, 999);
    const cur = new Date(start);
    while (cur <= end) {
      covered.add(localDateKey(cur.getFullYear(), cur.getMonth(), cur.getDate()));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return covered;
}

interface Props {
  orders: PassOrder[];
}

export function PassCalendar({ orders }: Props) {
  const today = todayKey();

  const coveredDays = useMemo(() => buildCoveredSet(orders), [orders]);

  // 3 past + current + 8 ahead = 12 months
  const months = useMemo(() => {
    const now = new Date();
    const result: { year: number; month: number }[] = [];
    for (let offset = -3; offset <= 8; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      result.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return result;
  }, []);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-container" />
          <span className="font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Activo / Pre-pagado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-container/25" />
          <span className="font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Historial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 ring-2 ring-white ring-offset-1 ring-offset-surface-container-low" />
          <span className="font-headline text-[10px] uppercase tracking-widest text-on-surface/50">Hoy</span>
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {months.map(({ year, month }) => {
          const now = new Date();
          const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const startDow = new Date(year, month, 1).getDay(); // 0=Sun

          const cells: (number | null)[] = [
            ...Array<null>(startDow).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
          ];
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div
              key={`${year}-${month}`}
              className={`bg-surface-container p-4 ${isCurrentMonth ? "outline outline-1 outline-primary-container" : ""}`}
            >
              <p className={`font-headline font-black text-xs uppercase tracking-widest mb-3 ${isCurrentMonth ? "text-primary-container" : "text-on-surface/40"}`}>
                {MONTHS_ES[month]} {year}
              </p>

              <div className="grid grid-cols-7 gap-[2px]">
                {DAYS_ES.map((d, i) => (
                  <div key={i} className="text-center font-headline text-[9px] text-on-surface/30 py-0.5">
                    {d}
                  </div>
                ))}

                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} className="aspect-square" />;

                  const key = localDateKey(year, month, day);
                  const isToday = key === today;
                  const isPast = key < today;
                  const isCovered = coveredDays.has(key);

                  let cellClass = "text-on-surface/20";
                  if (isCovered && isPast) cellClass = "bg-primary-container/25 text-primary-container/70";
                  if (isCovered && !isPast) cellClass = "bg-primary-container text-white font-black";
                  if (isToday && isCovered) cellClass = "bg-primary-container text-white font-black ring-2 ring-white ring-offset-1 ring-offset-surface-container z-10 relative";
                  if (isToday && !isCovered) cellClass = "text-on-surface/50 ring-2 ring-primary-container/60 ring-offset-1 ring-offset-surface-container z-10 relative";

                  return (
                    <div
                      key={idx}
                      className={`aspect-square flex items-center justify-center font-headline text-[11px] leading-none transition-colors ${cellClass}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
