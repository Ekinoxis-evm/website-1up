import {
  pgTable, serial, text, integer, timestamp, varchar, boolean,
  pgEnum, jsonb,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────
export const tipoDocumentoEnum = pgEnum("tipo_documento", ["CC", "CE", "TI", "PP", "NIT"]);
export const discountTriggerEnum = pgEnum("discount_trigger", ["comfenalco", "promo_code", "manual", "auto"]);
export const discountAppliesToEnum = pgEnum("discount_applies_to", ["courses", "pass", "all"]);
export const productTypeEnum = pgEnum("product_type", ["course", "pass"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected", "cancelled"]);

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
  imageUrl:      text("image_url"),
  masterId:      integer("master_id").references(() => masters.id, { onDelete: "set null" }),
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

// ── User Profiles ────────────────────────────────────────────────
export const userProfiles = pgTable("user_profiles", {
  id:                    serial("id").primaryKey(),
  privyUserId:           text("privy_user_id").notNull().unique(),
  email:                 text("email"),
  tipoDocumento:         tipoDocumentoEnum("tipo_documento"),
  numeroDocumento:       varchar("numero_documento", { length: 50 }),
  comfenalcoAfiliado:    boolean("comfenalco_afiliado").default(false),
  comfenalcoVerifiedAt:  timestamp("comfenalco_verified_at"),
  verifiedAliados:       jsonb("verified_aliados").$type<number[]>().default([]),
  createdAt:             timestamp("created_at").defaultNow(),
  updatedAt:             timestamp("updated_at").defaultNow(),
});

// ── Discount Rules ───────────────────────────────────────────────
export const discountRules = pgTable("discount_rules", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  triggerType: discountTriggerEnum("trigger_type").notNull(),  // comfenalco | promo_code | manual | auto
  discountPct: integer("discount_pct").notNull(),              // 0–100
  appliesTo:   discountAppliesToEnum("applies_to").notNull(),  // courses | pass | all
  aliadoId:    integer("aliado_id").references(() => aliados.id, { onDelete: "set null" }),
  isActive:    boolean("is_active").default(true),
  validFrom:   timestamp("valid_from"),
  validUntil:  timestamp("valid_until"),
  createdBy:   text("created_by"),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── Enrollments ──────────────────────────────────────────────────
export const enrollments = pgTable("enrollments", {
  id:                 serial("id").primaryKey(),
  userProfileId:      integer("user_profile_id").references(() => userProfiles.id).notNull(),
  productType:        productTypeEnum("product_type").notNull(),   // course | pass
  courseId:           integer("course_id").references(() => courses.id, { onDelete: "set null" }),
  originalPriceCop:   integer("original_price_cop").notNull(),
  discountRuleId:     integer("discount_rule_id").references(() => discountRules.id, { onDelete: "set null" }),
  discountPctApplied: integer("discount_pct_applied").default(0),
  finalPriceCop:      integer("final_price_cop").notNull(),
  mpPreferenceId:     text("mp_preference_id"),
  mpPaymentId:        text("mp_payment_id"),
  paymentStatus:      paymentStatusEnum("payment_status").default("pending"),
  paidAt:             timestamp("paid_at"),
  createdAt:          timestamp("created_at").defaultNow(),
});

// ── Social Links ─────────────────────────────────────────────────
export const socialLinks = pgTable("social_links", {
  id:        serial("id").primaryKey(),
  platform:  varchar("platform", { length: 50 }).notNull(),
  url:       text("url"),
  isActive:  boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Masters ──────────────────────────────────────────────────────
export const masters = pgTable("masters", {
  id:           serial("id").primaryKey(),
  name:         varchar("name",      { length: 200 }).notNull(),
  specialty:    varchar("specialty", { length: 200 }),
  bio:          text("bio"),
  photoUrl:     text("photo_url"),
  instagramUrl: text("instagram_url"),
  tiktokUrl:    text("tiktok_url"),
  twitterUrl:   text("twitter_url"),
  youtubeUrl:   text("youtube_url"),
  linkedinUrl:  text("linkedin_url"),
  topics:       jsonb("topics").$type<string[]>().default([]),
  sortOrder:    integer("sort_order").default(0),
  isActive:     boolean("is_active").default(true),
  createdAt:    timestamp("created_at").defaultNow(),
});

// ── Aliados (Partners / Clients) ─────────────────────────────────
export const aliados = pgTable("aliados", {
  id:        serial("id").primaryKey(),
  name:      varchar("name",  { length: 200 }).notNull(),
  nit:       varchar("nit",   { length: 50 }),
  email:     varchar("email", { length: 300 }),
  apiUrl:    text("api_url"),
  apiKey:    text("api_key"),           // store encrypted / via env in prod
  logoUrl:   text("logo_url"),
  isActive:  boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Academia Content (videos / docs per course) ───────────────────
export const academiaContent = pgTable("academia_content", {
  id:          serial("id").primaryKey(),
  courseId:    integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  contentType: varchar("content_type", { length: 20 }).notNull(), // 'video' | 'document' | 'quiz'
  title:       varchar("title",        { length: 200 }).notNull(),
  description: text("description"),
  url:         text("url"),
  sortOrder:   integer("sort_order").default(0),
  isPublished: boolean("is_published").default(false),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── Type exports ─────────────────────────────────────────────────
export type GameCategory    = typeof gameCategories.$inferSelect;
export type Game            = typeof games.$inferSelect;
export type Player          = typeof players.$inferSelect;
export type Competition     = typeof competitions.$inferSelect;
export type Course          = typeof courses.$inferSelect;
export type PassBenefit     = typeof passBenefits.$inferSelect;
export type FloorInfo       = typeof floorInfo.$inferSelect;
export type Submission      = typeof recruitmentSubmissions.$inferSelect;
export type UserProfile     = typeof userProfiles.$inferSelect;
export type DiscountRule    = typeof discountRules.$inferSelect;
export type Enrollment      = typeof enrollments.$inferSelect;
export type Master          = typeof masters.$inferSelect;
export type Aliado          = typeof aliados.$inferSelect;
export type AcademiaContent = typeof academiaContent.$inferSelect;
