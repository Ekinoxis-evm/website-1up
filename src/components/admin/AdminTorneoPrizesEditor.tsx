"use client";

export type PrizeFormRow = {
  position:     1 | 2 | 3;
  prizeType:    "tokens" | "cop" | "both";
  amountTokens: string;
  amountCop:    string;
};

const EMPTY_ROW = (position: 1 | 2 | 3): PrizeFormRow => ({
  position, prizeType: "cop", amountTokens: "", amountCop: "",
});

interface Props {
  value:    PrizeFormRow[];
  onChange: (prizes: PrizeFormRow[]) => void;
}

const POSITION_LABELS: Record<number, string> = { 1: "1° Lugar", 2: "2° Lugar", 3: "3° Lugar" };

export function AdminTorneoPrizesEditor({ value, onChange }: Props) {
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
        {value.map((row, i) => (
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
                  onChange={(e) => updateRow(i, { prizeType: e.target.value as PrizeFormRow["prizeType"] })}
                  className="w-full bg-surface-container text-on-background p-2 font-headline font-bold text-xs border-none focus:outline-none"
                >
                  <option value="cop">COP $</option>
                  <option value="tokens">Tokens $1UP</option>
                  <option value="both">Ambos</option>
                </select>
              </div>

              {(row.prizeType === "cop" || row.prizeType === "both") && (
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

              {(row.prizeType === "tokens" || row.prizeType === "both") && (
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
          </div>
        ))}
      </div>

      {nextPosition && (
        <button
          type="button"
          onClick={() => onChange([...value, EMPTY_ROW(nextPosition)])}
          className="mt-2 font-headline font-bold text-xs uppercase tracking-widest text-secondary hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Añadir {POSITION_LABELS[nextPosition]}
        </button>
      )}
    </div>
  );
}
