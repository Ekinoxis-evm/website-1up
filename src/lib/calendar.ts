export function buildGoogleCalendarUrl(opts: {
  name: string;
  date: string;
  location: string;
  description?: string;
}): string {
  const start = new Date(opts.date);
  const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h default

  function fmt(d: Date) {
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  const params = new URLSearchParams({
    action:   "TEMPLATE",
    text:     opts.name,
    dates:    `${fmt(start)}/${fmt(end)}`,
    location: opts.location,
    details:  opts.description ?? `Torneo en 1UP Gaming Tower — ${opts.name}`,
    sf:       "true",
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent(opts: {
  name: string;
  date: string;
  location: string;
  description?: string;
}): string {
  const start = new Date(opts.date);
  const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  function fmt(d: Date) {
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  const uid = `tournament-${Date.now()}@1upesports.org`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//1UP Gaming Tower//ES",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${opts.name}`,
    `LOCATION:${opts.location}`,
    `DESCRIPTION:${opts.description ?? "Torneo 1UP Gaming Tower"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
