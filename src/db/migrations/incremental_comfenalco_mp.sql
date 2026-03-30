-- ============================================================
-- Incremental migration: Comfenalco + MercadoPago
-- Run this in Supabase SQL Editor (Settings → SQL Editor)
-- Safe to run on an existing database.
-- ============================================================

-- 1. New ENUMs
CREATE TYPE "public"."tipo_documento" AS ENUM ('CC', 'CE', 'TI', 'PP', 'NIT');
CREATE TYPE "public"."discount_trigger" AS ENUM ('comfenalco', 'promo_code', 'manual', 'auto');
CREATE TYPE "public"."discount_applies_to" AS ENUM ('courses', 'pass', 'all');
CREATE TYPE "public"."product_type" AS ENUM ('course', 'pass');
CREATE TYPE "public"."payment_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- 2. user_profiles
CREATE TABLE "user_profiles" (
  "id"                    serial PRIMARY KEY,
  "privy_user_id"         text NOT NULL,
  "email"                 text,
  "tipo_documento"        "tipo_documento",
  "numero_documento"      varchar(50),
  "comfenalco_afiliado"   boolean DEFAULT false,
  "comfenalco_verified_at" timestamp,
  "created_at"            timestamp DEFAULT now(),
  "updated_at"            timestamp DEFAULT now(),
  CONSTRAINT "user_profiles_privy_user_id_unique" UNIQUE ("privy_user_id")
);

-- 3. discount_rules
CREATE TABLE "discount_rules" (
  "id"           serial PRIMARY KEY,
  "name"         varchar(200) NOT NULL,
  "description"  text,
  "trigger_type" "discount_trigger" NOT NULL,
  "discount_pct" integer NOT NULL,
  "applies_to"   "discount_applies_to" NOT NULL,
  "is_active"    boolean DEFAULT true,
  "valid_from"   timestamp,
  "valid_until"  timestamp,
  "created_by"   text,
  "created_at"   timestamp DEFAULT now()
);

-- 4. enrollments
CREATE TABLE "enrollments" (
  "id"                   serial PRIMARY KEY,
  "user_profile_id"      integer NOT NULL REFERENCES "user_profiles"("id"),
  "product_type"         "product_type" NOT NULL,
  "course_id"            integer REFERENCES "courses"("id") ON DELETE SET NULL,
  "original_price_cop"   integer NOT NULL,
  "discount_rule_id"     integer REFERENCES "discount_rules"("id") ON DELETE SET NULL,
  "discount_pct_applied" integer DEFAULT 0,
  "final_price_cop"      integer NOT NULL,
  "mp_preference_id"     text,
  "mp_payment_id"        text,
  "payment_status"       "payment_status" DEFAULT 'pending',
  "paid_at"              timestamp,
  "created_at"           timestamp DEFAULT now()
);

-- 5. Drop payment_link from courses (replaced by MercadoPago checkout)
ALTER TABLE "courses" DROP COLUMN IF EXISTS "payment_link";

-- 6. Enable RLS on new tables (Supabase best practice)
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discount_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies — service role bypasses RLS, so API routes using
--    supabaseAdmin (service key) work without policies.
--    Public read is intentionally blocked — all access via API routes.
