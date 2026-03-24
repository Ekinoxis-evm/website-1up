const STATS = [
  { value: "100", label: "PlayStation", sublabel: "Pro-Grade Units" },
  { value: "100", label: "Monitores",   sublabel: "High-Refresh Displays" },
];

export function EquipmentHighlight() {
  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-lowest">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1">
          <div className="inline-block bg-tertiary px-3 py-1 mb-6">
            <span className="text-background font-black text-xs uppercase tracking-widest font-headline">
              ELITE HARDWARE AS STANDARD
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {STATS.map(({ value, label, sublabel }) => (
              <div key={label} className="bg-surface-container p-8 border-l-[12px] border-secondary-container">
                <div className="font-headline font-black text-7xl text-on-background leading-none">{value}</div>
                <div className="font-headline font-bold text-secondary mt-2 uppercase tracking-tight">{label}</div>
                <div className="font-body text-xs text-outline mt-1 uppercase tracking-widest">{sublabel}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 max-w-md">
          <div className="w-full aspect-square bg-surface-container flex items-center justify-center border-4 border-secondary-container/30">
            <span className="material-symbols-outlined text-[8rem] text-secondary-container/40">videogame_asset</span>
          </div>
        </div>
      </div>
    </section>
  );
}
