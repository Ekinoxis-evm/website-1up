"use client";

import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import type { Value as PhoneValue } from "react-phone-number-input";
import type { GameCategory, Game } from "@/types/database.types";

interface Props {
  categories: GameCategory[];
  games: Game[];
  extended?: boolean;
}

export function RecruitmentForm({ categories, games, extended = false }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [phone, setPhone] = useState<PhoneValue>();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const filteredGames = selectedCategory
    ? games.filter((g) => g.category_id === parseInt(selectedCategory))
    : games;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, phone, source: extended ? "team" : "home" }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      form.reset();
      setSelectedCategory("");
      setPhone(undefined);
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="py-24 px-6 bg-surface-container-low flex flex-col items-center">
      <div className="max-w-4xl w-full bg-surface-container p-12 relative border-r-8 border-b-8 border-primary-container">
        {/* Badge */}
        <div className="absolute -top-6 -left-6 bg-primary text-background font-black px-8 py-3 skew-fix">
          <span className="skew-content block uppercase tracking-tighter font-headline">RECRUITMENT OPEN</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4">
          {/* Left copy */}
          <div>
            <h2 className="font-headline text-5xl font-black mb-6 leading-none">
              JOIN THE <span className="text-primary italic">TEAM</span>
            </h2>
            <p className="text-secondary text-lg mb-8 font-body">
              ¿Tienes lo necesario para ser profesional? Déjanos tus datos y nuestro staff se pondrá en contacto.
            </p>
            <div className="space-y-4">
              {["EQUIPAMIENTO DE ÉLITE", "COACHING PROFESIONAL", "EXPOSICIÓN GLOBAL"].map((item) => (
                <div key={item} className="flex items-center gap-4 text-primary">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="font-headline font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name" required placeholder="NOMBRE" type="text"
              className="w-full bg-surface-container-lowest border-none text-on-background p-4 focus:ring-2 focus:ring-secondary font-headline font-bold placeholder:text-outline"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                name="email" required placeholder="EMAIL" type="email"
                className="w-full bg-surface-container-lowest border-none text-on-background p-4 focus:ring-2 focus:ring-secondary font-headline font-bold placeholder:text-outline"
              />
              <PhoneInput
                international
                defaultCountry="CO"
                value={phone}
                onChange={setPhone}
                placeholder="TELÉFONO"
                className="phone-input-1up"
              />
            </div>

            {extended && (
              <input
                name="gamertag" placeholder="GAMERTAG" type="text"
                className="w-full bg-surface-container-lowest border-none text-on-background p-4 focus:ring-2 focus:ring-secondary font-headline font-bold placeholder:text-outline"
              />
            )}

            <select
              name="categoryId"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-surface-container-lowest border-none text-on-background p-4 focus:ring-2 focus:ring-secondary font-headline font-bold appearance-none"
            >
              <option value="">CATEGORÍA</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
              ))}
            </select>

            <select
              name="gameId"
              className="w-full bg-surface-container-lowest border-none text-on-background p-4 focus:ring-2 focus:ring-secondary font-headline font-bold appearance-none"
            >
              <option value="">JUEGO PRINCIPAL</option>
              {filteredGames.map((g) => (
                <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>
              ))}
            </select>

            {extended && (
              <textarea
                name="message" placeholder="¿POR QUÉ 1UP?" rows={3}
                className="w-full bg-surface-container-lowest border-none text-on-background p-4 focus:ring-2 focus:ring-secondary font-headline font-bold placeholder:text-outline resize-none"
              />
            )}

            {status === "ok" && (
              <p className="text-tertiary font-headline font-bold text-sm">✓ ¡Solicitud enviada! Nos pondremos en contacto.</p>
            )}
            {status === "error" && (
              <p className="text-error font-headline font-bold text-sm">Error al enviar. Intenta de nuevo.</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-secondary-container text-white py-4 font-headline font-black text-xl hover:bg-primary-container transition-colors skew-fix disabled:opacity-60"
            >
              <span className="block skew-content">
                {status === "loading" ? "ENVIANDO..." : "SEND INTEL"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
