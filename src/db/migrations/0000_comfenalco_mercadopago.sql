CREATE TYPE "public"."discount_applies_to" AS ENUM('courses', 'pass', 'all');--> statement-breakpoint
CREATE TYPE "public"."discount_trigger" AS ENUM('comfenalco', 'promo_code', 'manual', 'auto');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('course', 'pass');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('CC', 'CE', 'TI', 'PP', 'NIT');--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_name" varchar(300) NOT NULL,
	"country" varchar(100) NOT NULL,
	"city" varchar(100),
	"year" integer NOT NULL,
	"result" varchar(200) NOT NULL,
	"player_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"price_cop" integer,
	"duration_hours" integer,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discount_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"trigger_type" "discount_trigger" NOT NULL,
	"discount_pct" integer NOT NULL,
	"applies_to" "discount_applies_to" NOT NULL,
	"is_active" boolean DEFAULT true,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_profile_id" integer NOT NULL,
	"product_type" "product_type" NOT NULL,
	"course_id" integer,
	"original_price_cop" integer NOT NULL,
	"discount_rule_id" integer,
	"discount_pct_applied" integer DEFAULT 0,
	"final_price_cop" integer NOT NULL,
	"mp_preference_id" text,
	"mp_payment_id" text,
	"payment_status" "payment_status" DEFAULT 'pending',
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "floor_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"floor_label" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"accent_color" varchar(50),
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "game_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"category_id" integer NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pass_benefits" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"gamertag" varchar(100) NOT NULL,
	"real_name" varchar(200) NOT NULL,
	"role" varchar(100),
	"photo_url" text,
	"instagram_url" text,
	"tiktok_url" text,
	"kick_url" text,
	"youtube_url" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recruitment_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(300) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"category_id" integer,
	"game_id" integer,
	"gamertag" varchar(100),
	"portfolio_url" text,
	"message" text,
	"source" varchar(20) DEFAULT 'home',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"privy_user_id" text NOT NULL,
	"email" text,
	"tipo_documento" "tipo_documento",
	"numero_documento" varchar(50),
	"comfenalco_afiliado" boolean DEFAULT false,
	"comfenalco_verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_privy_user_id_unique" UNIQUE("privy_user_id")
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_discount_rule_id_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."discount_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_category_id_game_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."game_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_submissions" ADD CONSTRAINT "recruitment_submissions_category_id_game_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."game_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruitment_submissions" ADD CONSTRAINT "recruitment_submissions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;