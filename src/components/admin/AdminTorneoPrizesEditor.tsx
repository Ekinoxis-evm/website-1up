"use client";

export type PrizeFormRow = {
  position:     1 | 2 | 3;
  prizeType:    "tokens" | "cop" | "both" | "pass";
  amountTokens: string;
  amountCop:    string;
  includesPass: boolean;
  passDays:     string;
};

const EMPTY_ROW = (position: 1 | 2 | 3, defaultPassDays: number): PrizeFormRow => ({
  position,
  prizeType:    "cop",
  amountTokens: "",
  amountCop:    "",
  includesPass: false,
  passDays:     String(defaultPassDays),
});

interface Props {
  value:           PrizeFormRow[];
  onChange:        (prizes: PrizeFormRow[]) => void;
  defaultPassDays: number;
}

const POSITION_LABELS: Record<number, string> = { 1: "1° Lugar", 2: "2° Lugar", 3: "3° Lugar" };

export function AdminTorneoPrizesEditor({ value, onChange, defaultPassDays }: Props) {
  const usedPositions = value.map((r) => r.position);
  const nextPosition  = ([1, 2, 3] as const).find((p) => !usedPositions.includes(p));

  function updateRow(index: number, patch: Partial<PrizeFormRow>) {
    const updated = value.map((r, i) => i === index ? { ...r, ...patch } : r);
    onChange(updated);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-2">
        Premios por posición
      </label>

      <div className="space-y-3">
        {value.map((row, i) => {
          const isPassOnly = row.prizeType === "pass";
          const showCop    = row.prizeType === "cop" || row.prizeType === "both";
          const showTokens = row.prizeType === "tokens" || row.prizeType === "both";

          return (
          <div key={row.position} className="bg-surface-container-lowest p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-headline font-bold text-xs uppercase tracking-widest text-secondary">
                {POSITION_LABELS[row.position]}
              </span>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-outline hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">
                  Tipo
                </label>
                <select
                  value={row.prizeType}
                  onChange={(e) => {
                    const newType = e.target.value as PrizeFormRow["prizeType"];
                    const patch: Partial<PrizeFormRow> = { prizeType: newType };
                    if (newType === "pass") {
                      patch.includesPass = true;
                      patch.amountTokens = "";
                      patch.amountCop    = "";
                      if (!row.passDays || row.passDays === "0") patch.passDays = String(defaultPassDays);
                    }
                    updateRow(i, patch);
                  }}
                  className="w-full bg-surface-container text-on-background p-2 font-headline font-bold text-xs border-none focus:outline-none"
                >
                  <option value="cop">COP $</option>
                  <option value="tokens">Tokens $1UP</option>
                  <option value="both">Ambos</option>
                  <option value="pass">Pase 1UP (solo)</option>
                </select>
              </div>

              {showCop && (
                <div>
                  <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">
                    COP
                  </label>
                  <input
                    type="number"
                    value={row.amountCop}
                    onChange={(e) => updateRow(i, { amountCop: e.target.value })}
                    placeholder="500000"
                    className="w-full bg-surface-container text-on-background p-2 font-headline font-bold text-xs border-none focus:outline-none"
                  />
                </div>
              )}

              {showTokens && (
                <div>
                  <label className="block font-headline font-bold text-[10px] uppercase tracking-widest text-outline mb-1">
                    $1UP
                  </label>
                  <input
                    type="number"
                    value={row.amountTokens}
                    onChange={(e) => updateRow(i, { amountTokens: e.target.value })}
                    placeholder="1000"
                    className="w-full bg-surface-container text-on-background p-2 font-headline font-bold text-xs border-none focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="bg-surface-container p-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.includesPass}
                  disabled={isPassOnly}
                  onChange={(e) => {
                    const next = e.target.checked;
                    updateRow(i, {
                      includesPass: next,
                      passDays:     next ? (row.passDays || String(defaultPassDays)) : "",
                    });
                  }}
                  className="accent-primary-container"
                />
                <span className="font-headline font-bold text-[11px] uppercase tracking-widest text-on-background">
                  Incluir Pase 1UP
                  {isPassOnly && <span className="ml-2 text-outline normal-case tracking-normal text-[10px]">(implícito en tipo Pase)</span>}
                </span>
              </label>

              {row.includesPass && (
                <div className="flex items-center gap-2">
                  <label className="font-headline font-bold text-[10px] uppercase tracking-widest text-outline">
                    Duración
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={row.passDays}
                    onChange={(e) => updateRow(i, { passDays: e.target.value })}
                    placeholder={String(defaultPassDays)}
                    className="w-24 bg-surface-container-lowest text-on-background p-2 font-headline font-bold text-xs border-none focus:outline-none"
                  />
                  <span className="font-body text-xs text-outline">días</span>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {nextPosition && (
        <button
          type="button"
          onClick={() => onChange([...value, EMPTY_ROW(nextPosition, defaultPassDays)])}
          className="mt-2 font-headline font-bold text-xs uppercase tracking-widest text-secondary hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Añadir {POSITION_LABELS[nextPosition]}
        </button>
      )}
    </div>
  );
}
