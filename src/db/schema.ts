import {
  pgTable, serial, text, integer, timestamp, varchar, boolean,
} from "drizzle-orm/pg-core";

// ── Game Categories & Games ─────────────────────────────────────
export const gameCategories = pgTable("game_categories", {
  id:        serial("id").primaryKey(),
  name:      varchar("name",  { length: 100 }).notNull(),
  slug:      varchar("slug",  { length: 100 }).notNull().unique(),
  imageUrl:  text("image_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const games = pgTable("games", {
  id:         serial("id").primaryKey(),
  name:       varchar("name",  { length: 200 }).notNull(),
  categoryId: integer("category_id").references(() => gameCategories.id, { onDelete: "cascade" }).notNull(),
  imageUrl:   text("image_url"),
  sortOrder:  integer("sort_order").default(0),
  createdAt:  timestamp("created_at").defaultNow(),
});

// ── Players ─────────────────────────────────────────────────────
export const players = pgTable("players", {
  id:           serial("id").primaryKey(),
  gamertag:     varchar("gamertag",  { length: 100 }).notNull(),
  realName:     varchar("real_name", { length: 200 }).notNull(),
  role:         varchar("role",      { length: 100 }),
  photoUrl:     text("photo_url"),
  instagramUrl: text("instagram_url"),
  tiktokUrl:    text("tiktok_url"),
  kickUrl:      text("kick_url"),
  youtubeUrl:   text("youtube_url"),
  sortOrder:    integer("sort_order").default(0),
  isActive:     boolean("is_active").default(true),
  createdAt:    timestamp("created_at").defaultNow(),
});

// ── Competitions (Hall of Fame) ──────────────────────────────────
export const competitions = pgTable("competitions", {
  id:             serial("id").primaryKey(),
  tournamentName: varchar("tournament_name", { length: 300 }).notNull(),
  country:        varchar("country",         { length: 100 }).notNull(),
  city:           varchar("city",            { length: 100 }),
  year:           integer("year").notNull(),
  result:         varchar("result",          { length: 200 }).notNull(),
  playerId:       integer("player_id").references(() => players.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").defaultNow(),
});

// ── Courses (Academia) ───────────────────────────────────────────
export const courses = pgTable("courses", {
  id:            serial("id").primaryKey(),
  name:          varchar("name",     { length: 200 }).notNull(),
  // "Performance" | "Technology" | "Gaming"
  category:      varchar("category", { length: 50 }).notNull(),
  description:   text("description"),
  priceCop:      integer("price_cop"),
  durationHours: integer("duration_hours"),
  paymentLink:   text("payment_link"),
  imageUrl:      text("image_url"),
  sortOrder:     integer("sort_order").default(0),
  isActive:      boolean("is_active").default(true),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ── 1UP Pass Benefits ────────────────────────────────────────────
export const passBenefits = pgTable("pass_benefits", {
  id:          serial("id").primaryKey(),
  title:       varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  sortOrder:   integer("sort_order").default(0),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── Floor Info ───────────────────────────────────────────────────
export const floorInfo = pgTable("floor_info", {
  id:          serial("id").primaryKey(),
  floorLabel:  varchar("floor_label", { length: 20 }).notNull(),   // "01", "02-03", "04-05", "06"
  title:       varchar("title",       { length: 200 }).notNull(),
  description: text("description").notNull(),
  accentColor: varchar("accent_color",{ length: 50 }),              // tailwind class fragment, e.g. "primary-container"
  imageUrl:    text("image_url"),
  sortOrder:   integer("sort_order").default(0),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── Recruitment Submissions ──────────────────────────────────────
export const recruitmentSubmissions = pgTable("recruitment_submissions", {
  id:           serial("id").primaryKey(),
  name:         varchar("name",     { length: 200 }).notNull(),
  email:        varchar("email",    { length: 300 }).notNull(),
  phone:        varchar("phone",    { length: 50 }).notNull(),
  categoryId:   integer("category_id").references(() => gameCategories.id),
  gameId:       integer("game_id").references(() => games.id),
  gamertag:     varchar("gamertag",     { length: 100 }),
  portfolioUrl: text("portfolio_url"),
  message:      text("message"),
  // "home" | "team"
  source:       varchar("source",   { length: 20 }).default("home"),
  createdAt:    timestamp("created_at").defaultNow(),
});

// ── Type exports ─────────────────────────────────────────────────
export type GameCategory  = typeof gameCategories.$inferSelect;
export type Game          = typeof games.$inferSelect;
export type Player        = typeof players.$inferSelect;
export type Competition   = typeof competitions.$inferSelect;
export type Course        = typeof courses.$inferSelect;
export type PassBenefit   = typeof passBenefits.$inferSelect;
export type FloorInfo     = typeof floorInfo.$inferSelect;
export type Submission    = typeof recruitmentSubmissions.$inferSelect;
