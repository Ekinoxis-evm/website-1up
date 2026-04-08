import type { Master } from "@/types/database.types";
import { MasterCard } from "./MasterCard";

interface Props {
  masters: Master[];
  coursesByMaster: Record<number, { id: number; name: string; category: string }[]>;
}

export function MasterGrid({ masters, coursesByMaster }: Props) {
  if (masters.length === 0) {
    return (
      <section className="py-20 px-8 md:px-16 text-center">
        <p className="font-headline uppercase text-on-surface/30 tracking-widest text-sm">
          Próximamente — los masters se están preparando.
        </p>
      </section>
    );
  }

  return (
    <section className="py-20 px-8 md:px-16 bg-surface-container-lowest">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {masters.map((m) => (
          <MasterCard key={m.id} master={m} courses={coursesByMaster[m.id] ?? []} />
        ))}
      </div>
    </section>
  );
}
