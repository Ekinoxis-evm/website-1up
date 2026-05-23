-- =====================================================================
-- BASELINE MIGRATION — captures the full live public schema of `1uptower`
-- (Supabase project kwqfpkvalspuvyiszrfh) as of 2026-05-22.
--
-- This file closes audit finding H-7 (un-versioned schema). It is *fully
-- idempotent* — running it on a fresh database produces the live state;
-- running it on the live database is a no-op. It is timestamped
-- 00000000000000 so it sorts FIRST in the migration log; the two pre-
-- existing migrations (add_privy_identity_to_user_profiles and
-- gate_register_for_tournament_on_upcoming_status) run after it and
-- remain idempotent themselves.
-- =====================================================================


-- =====================================================================
-- EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =====================================================================
-- ENUM TYPES
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bracket_format') THEN
    CREATE TYPE bracket_format AS ENUM ('single_elimination', 'double_elimination');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bracket_status') THEN
    CREATE TYPE bracket_status AS ENUM ('draft', 'published', 'in_progress', 'completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_applies_to') THEN
    CREATE TYPE discount_applies_to AS ENUM ('courses', 'pass', 'all');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_trigger') THEN
    CREATE TYPE discount_trigger AS ENUM ('comfenalco', 'promo_code', 'manual', 'auto');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_state') THEN
    CREATE TYPE match_state AS ENUM ('pending', 'ready', 'in_progress', 'completed', 'bye');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pass_order_status') THEN
    CREATE TYPE pass_order_status AS ENUM ('pending_tx', 'confirmed', 'failed', 'expired_unverified', 'pending_bank');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pass_status_enum') THEN
    CREATE TYPE pass_status_enum AS ENUM ('never', 'active', 'expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prize_delivery_status') THEN
    CREATE TYPE prize_delivery_status AS ENUM ('no_prize', 'pending', 'sent');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
    CREATE TYPE product_type AS ENUM ('course', 'pass');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_source') THEN
    CREATE TYPE slot_source AS ENUM ('seed', 'winner_of', 'loser_of', 'bye');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_documento') THEN
    CREATE TYPE tipo_documento AS ENUM ('CC', 'CE', 'TI', 'PP', 'NIT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'token_purchase_status') THEN
    CREATE TYPE token_purchase_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  END IF;
END $$;


-- =====================================================================
-- TABLES
-- Each CREATE TABLE IF NOT EXISTS uses SERIAL / BIGSERIAL where the live
-- schema uses `<type> NOT NULL DEFAULT nextval(...)` — Postgres
-- auto-creates and owns the sequence, so the result is identical.
-- Foreign-key / unique / check constraints are declared in a separate
-- block below to keep table creation order independent of FK direction.
-- =====================================================================

-- Independent (no outbound FKs) -----------------------------------------

CREATE TABLE IF NOT EXISTS public.game_categories (
  id          SERIAL PRIMARY KEY,
  name        varchar(100) NOT NULL,
  slug        varchar(100) NOT NULL,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  image_url   text
);

CREATE TABLE IF NOT EXISTS public.players (
  id            SERIAL PRIMARY KEY,
  gamertag      varchar(100) NOT NULL,
  real_name     varchar(200) NOT NULL,
  role          varchar(100),
  photo_url     text,
  instagram_url text,
  tiktok_url    text,
  kick_url      text,
  youtube_url   text,
  sort_order    integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.masters (
  id            SERIAL PRIMARY KEY,
  name          varchar(200) NOT NULL,
  specialty     varchar(200),
  bio           text,
  photo_url     text,
  instagram_url text,
  tiktok_url    text,
  twitter_url   text,
  youtube_url   text,
  linkedin_url  text,
  topics        jsonb DEFAULT '[]'::jsonb,
  sort_order    integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamp DEFAULT now(),
  kick_url      text,
  twitch_url    text,
  github_url    text,
  categories    text[] DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS public.social_links (
  id          SERIAL PRIMARY KEY,
  platform    varchar(50) NOT NULL,
  url         text,
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pass_benefits (
  id          SERIAL PRIMARY KEY,
  title       varchar(200) NOT NULL,
  description text,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pass_config (
  id                integer PRIMARY KEY DEFAULT 1,
  price_token       numeric(20,4) NOT NULL DEFAULT 30000,
  duration_days     integer NOT NULL DEFAULT 30,
  recipient_address text NOT NULL DEFAULT '0x2d772d0d0152f0d81363a81f06db7efc5d5ef339'::text,
  is_active         boolean NOT NULL DEFAULT true,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        text
);

CREATE TABLE IF NOT EXISTS public.floor_info (
  id            SERIAL PRIMARY KEY,
  floor_label   varchar(20) NOT NULL,
  title         varchar(200) NOT NULL,
  description   text NOT NULL,
  accent_color  varchar(50),
  image_url     text,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id              BIGSERIAL PRIMARY KEY,
  bank_name       text NOT NULL,
  account_type    text NOT NULL,
  account_number  text NOT NULL,
  holder_name     text NOT NULL,
  holder_document text,
  instructions    text,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruitment_submissions (
  id            SERIAL PRIMARY KEY,
  name          varchar(200) NOT NULL,
  email         varchar(300) NOT NULL,
  phone         varchar(50)  NOT NULL,
  category_id   integer,
  game_id       integer,
  gamertag      varchar(100),
  portfolio_url text,
  message       text,
  source        varchar(20) DEFAULT 'home'::character varying,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_content (
  key         text PRIMARY KEY,
  image_url   text,
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          BIGSERIAL PRIMARY KEY,
  code        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  max_uses    integer,
  used_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.aliados (
  id              SERIAL PRIMARY KEY,
  name            varchar(200) NOT NULL,
  nit             varchar(50),
  email           varchar(300),
  api_url         text,
  api_key         text,
  logo_url        text,
  is_active       boolean DEFAULT true,
  created_at      timestamp DEFAULT now(),
  website_url     text,
  sort_order      integer NOT NULL DEFAULT 0,
  show_in_banner  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id          SERIAL PRIMARY KEY,
  email       varchar(300) NOT NULL,
  added_by    varchar(300),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                      SERIAL PRIMARY KEY,
  privy_user_id           text NOT NULL,
  email                   text,
  tipo_documento          tipo_documento,
  numero_documento        varchar(50),
  comfenalco_afiliado     boolean DEFAULT false,
  comfenalco_verified_at  timestamp,
  created_at              timestamp DEFAULT now(),
  updated_at              timestamp DEFAULT now(),
  verified_aliados        jsonb DEFAULT '[]'::jsonb,
  nombre                  varchar(100),
  apellidos               varchar(100),
  username                varchar(50),
  phone_country           varchar(10),
  phone_number            varchar(20),
  game_ids                integer[] NOT NULL DEFAULT '{}'::integer[],
  barrio                  text,
  onboarding_completed_at timestamptz,
  referred_by_code        text,
  birth_date              date,
  pass_status             pass_status_enum NOT NULL DEFAULT 'never'::pass_status_enum,
  wallet_address          text,
  auth_provider           text,
  linked_accounts         jsonb,
  privy_created_at        timestamptz,
  last_synced_at          timestamptz
);

-- Dependent tables -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.games (
  id           SERIAL PRIMARY KEY,
  name         varchar(200) NOT NULL,
  category_id  integer NOT NULL,
  image_url    text,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitions (
  id              SERIAL PRIMARY KEY,
  tournament_name varchar(300) NOT NULL,
  country         varchar(100) NOT NULL,
  city            varchar(100),
  year            integer NOT NULL,
  result          varchar(200) NOT NULL,
  player_id       integer,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discount_rules (
  id            SERIAL PRIMARY KEY,
  name          varchar(200) NOT NULL,
  description   text,
  trigger_type  discount_trigger NOT NULL,
  discount_pct  integer NOT NULL,
  applies_to    discount_applies_to NOT NULL,
  is_active     boolean DEFAULT true,
  valid_from    timestamp,
  valid_until   timestamp,
  created_by    text,
  created_at    timestamp DEFAULT now(),
  aliado_id     integer
);

CREATE TABLE IF NOT EXISTS public.courses (
  id                   SERIAL PRIMARY KEY,
  name                 varchar(200) NOT NULL,
  category             varchar(50)  NOT NULL,
  description          text,
  price_cop            integer,
  duration_hours       integer,
  image_url            text,
  sort_order           integer DEFAULT 0,
  is_active            boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  master_id            integer,
  price_token          integer,
  intro_video_uid      text,
  intro_description    text,
  session_duration_min integer
);

CREATE TABLE IF NOT EXISTS public.course_modules (
  id            BIGSERIAL PRIMARY KEY,
  course_id     bigint NOT NULL,
  title         text NOT NULL,
  description   text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_sessions (
  id                BIGSERIAL PRIMARY KEY,
  module_id         bigint NOT NULL,
  title             text NOT NULL,
  description       text,
  video_uid         text,
  duration_minutes  integer,
  sort_order        integer NOT NULL DEFAULT 0,
  is_published      boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_session_links (
  id          BIGSERIAL PRIMARY KEY,
  session_id  bigint NOT NULL,
  label       text NOT NULL,
  url         text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_session_documents (
  id            BIGSERIAL PRIMARY KEY,
  session_id    bigint NOT NULL,
  label         text NOT NULL,
  storage_path  text NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    integer NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  uploaded_by   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Deprecated, kept read-only — see CLAUDE.md
CREATE TABLE IF NOT EXISTS public.academia_content (
  id            SERIAL PRIMARY KEY,
  course_id     integer NOT NULL,
  content_type  varchar(20) NOT NULL,
  title         varchar(200) NOT NULL,
  description   text,
  url           text,
  sort_order    integer DEFAULT 0,
  is_published  boolean DEFAULT false,
  created_at    timestamp DEFAULT now(),
  stream_uid    text
);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id                    SERIAL PRIMARY KEY,
  name                  text NOT NULL,
  game_id               integer,
  date                  timestamptz,
  prize_pool_cop        integer,
  max_participants      integer,
  status                text NOT NULL DEFAULT 'upcoming'::text,
  location_type         text NOT NULL DEFAULT 'presencial'::text,
  image_url             text,
  description           text,
  is_active             boolean NOT NULL DEFAULT true,
  is_registration_open  boolean NOT NULL DEFAULT false,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  sponsor_name          text,
  sponsor_website_url   text,
  sponsor_logo_url      text,
  slug                  text
);

CREATE TABLE IF NOT EXISTS public.tournament_prizes (
  id              SERIAL PRIMARY KEY,
  tournament_id   integer NOT NULL,
  "position"      smallint NOT NULL,
  prize_type      text NOT NULL,
  amount_tokens   numeric(20,2),
  amount_cop      integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id              SERIAL PRIMARY KEY,
  tournament_id   integer NOT NULL,
  user_profile_id integer NOT NULL,
  privy_user_id   text NOT NULL,
  status          text NOT NULL DEFAULT 'registered'::text,
  registered_at   timestamptz NOT NULL DEFAULT now(),
  cancelled_at    timestamptz,
  notes           text
);

CREATE TABLE IF NOT EXISTS public.tournament_results (
  id                    SERIAL PRIMARY KEY,
  tournament_id         integer NOT NULL,
  user_profile_id       integer NOT NULL,
  "position"            smallint NOT NULL,
  points                smallint NOT NULL,
  awarded_at            timestamptz NOT NULL DEFAULT now(),
  awarded_by            text,
  prize_status          prize_delivery_status NOT NULL DEFAULT 'no_prize'::prize_delivery_status,
  prize_tx_hash         text,
  prize_sent_at         timestamptz,
  prize_sent_by         text,
  prize_comprobante_url text
);

CREATE TABLE IF NOT EXISTS public.brackets (
  id                BIGSERIAL PRIMARY KEY,
  tournament_id     integer NOT NULL,
  format            bracket_format NOT NULL DEFAULT 'single_elimination'::bracket_format,
  status            bracket_status NOT NULL DEFAULT 'draft'::bracket_status,
  participant_count integer NOT NULL DEFAULT 0,
  rounds_winners    integer NOT NULL DEFAULT 0,
  rounds_losers     integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bracket_participants (
  id              BIGSERIAL PRIMARY KEY,
  bracket_id      bigint NOT NULL,
  user_profile_id integer,
  display_name    text NOT NULL,
  seed            integer NOT NULL,
  eliminated      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bracket_matches (
  id                  BIGSERIAL PRIMARY KEY,
  bracket_id          bigint NOT NULL,
  round               integer NOT NULL,
  match_number        integer NOT NULL,
  bracket_side        text NOT NULL DEFAULT 'winners'::text,
  state               match_state NOT NULL DEFAULT 'pending'::match_state,
  p1_id               bigint,
  p1_score            integer,
  p1_source           slot_source,
  p1_source_match_id  bigint,
  p2_id               bigint,
  p2_score            integer,
  p2_source           slot_source,
  p2_source_match_id  bigint,
  winner_id           bigint,
  loser_id            bigint,
  next_match_id       bigint,
  next_match_slot     integer,
  next_loser_match_id bigint,
  next_loser_slot     integer,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pass_orders (
  id                      BIGSERIAL PRIMARY KEY,
  user_profile_id         bigint NOT NULL,
  privy_user_id           text NOT NULL,
  email                   text,
  wallet_address          text NOT NULL,
  recipient_address       text NOT NULL,
  tx_hash                 text,
  token_amount_paid       numeric(20,4) NOT NULL,
  token_price_at_purchase numeric(20,4) NOT NULL,
  discount_pct_applied    numeric(5,2)  NOT NULL DEFAULT 0,
  discount_rule_id        bigint,
  duration_days           integer NOT NULL DEFAULT 30,
  status                  pass_order_status NOT NULL DEFAULT 'pending_tx'::pass_order_status,
  paid_at                 timestamptz,
  expires_at              timestamptz,
  block_number            bigint,
  verification_attempts   integer NOT NULL DEFAULT 0,
  last_verified_at        timestamptz,
  failure_reason          text,
  admin_notes             text,
  reviewed_by             text,
  reviewed_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  payment_method          text NOT NULL DEFAULT 'token'::text,
  bank_account_id         integer,
  comprobante_url         text,
  rejection_reason        text,
  started_at              timestamptz,
  granted_by              text
);

CREATE TABLE IF NOT EXISTS public.token_purchase_orders (
  id                  BIGSERIAL PRIMARY KEY,
  user_profile_id     bigint NOT NULL,
  privy_user_id       text NOT NULL,
  email               text NOT NULL,
  nombre              text NOT NULL,
  celular_contacto    text NOT NULL,
  wallet_address      text NOT NULL,
  cop_amount          integer NOT NULL,
  token_amount        numeric(20,4) NOT NULL,
  exchange_rate_cop   integer NOT NULL DEFAULT 1000,
  bank_account_id     bigint,
  comprobante_url     text NOT NULL,
  status              token_purchase_status NOT NULL DEFAULT 'pending'::token_purchase_status,
  admin_notes         text,
  rejection_reason    text,
  approved_tx_hash    text,
  reviewed_by         text,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id                    SERIAL PRIMARY KEY,
  user_profile_id       integer NOT NULL,
  product_type          product_type NOT NULL,
  course_id             integer,
  original_price_cop    integer NOT NULL,
  discount_rule_id      integer,
  discount_pct_applied  integer DEFAULT 0,
  final_price_cop       integer NOT NULL,
  mp_preference_id      text,
  mp_payment_id         text,
  payment_status        payment_status DEFAULT 'pending'::payment_status,
  paid_at               timestamp,
  created_at            timestamp DEFAULT now(),
  payment_method        text NOT NULL DEFAULT 'mercadopago'::text,
  comprobante_url       text,
  bank_account_id       integer,
  tx_hash               text,
  approved_tx_hash      text,
  rejection_reason      text,
  reviewed_by           text,
  reviewed_at           timestamptz
);

CREATE TABLE IF NOT EXISTS public.international_tournaments (
  id                SERIAL PRIMARY KEY,
  name              text NOT NULL,
  organizer         text,
  date              timestamptz,
  country           text,
  city              text,
  game_id           integer,
  registration_link text,
  image_url         text,
  description       text,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);


-- =====================================================================
-- CONSTRAINTS — UNIQUE, CHECK, FOREIGN KEY
-- Wrapped in DO blocks for idempotency. `duplicate_object` is raised when
-- the constraint already exists and we silently continue.
-- =====================================================================

DO $$ BEGIN ALTER TABLE public.admin_users           ADD CONSTRAINT admin_users_email_key UNIQUE (email);                                                                     EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bank_accounts         ADD CONSTRAINT bank_accounts_account_type_check CHECK ((account_type = ANY (ARRAY['ahorros'::text, 'corriente'::text]))); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches       ADD CONSTRAINT bracket_matches_bracket_id_bracket_side_round_match_number_key UNIQUE (bracket_id, bracket_side, round, match_number); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_participants  ADD CONSTRAINT bracket_participants_bracket_id_seed_key UNIQUE (bracket_id, seed);                                       EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_participants  ADD CONSTRAINT bracket_participants_bracket_id_user_profile_id_key UNIQUE (bracket_id, user_profile_id);                EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.brackets              ADD CONSTRAINT brackets_tournament_id_key UNIQUE (tournament_id);                                                       EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.game_categories       ADD CONSTRAINT game_categories_slug_key UNIQUE (slug);                                                                  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_config           ADD CONSTRAINT pass_config_duration_days_check CHECK ((duration_days > 0));                                              EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_config           ADD CONSTRAINT pass_config_id_check CHECK ((id = 1));                                                                   EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_config           ADD CONSTRAINT pass_config_price_token_check CHECK ((price_token > (0)::numeric));                                      EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_orders           ADD CONSTRAINT pass_orders_token_amount_paid_check CHECK ((token_amount_paid > (0)::numeric));                          EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.referral_codes        ADD CONSTRAINT referral_codes_code_key UNIQUE (code);                                                                   EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.token_purchase_orders ADD CONSTRAINT token_purchase_orders_cop_amount_check CHECK ((cop_amount > 0));                                         EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.token_purchase_orders ADD CONSTRAINT token_purchase_orders_token_amount_check CHECK ((token_amount > (0)::numeric));                          EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_prizes     ADD CONSTRAINT tournament_prizes_tournament_id_position_key UNIQUE (tournament_id, "position");                          EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_prizes     ADD CONSTRAINT tournament_prizes_position_check CHECK ((("position" >= 1) AND ("position" <= 3)));                      EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_prizes     ADD CONSTRAINT tournament_prizes_prize_type_check CHECK ((prize_type = ANY (ARRAY['tokens'::text, 'cop'::text, 'both'::text]))); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_prizes     ADD CONSTRAINT tournament_prizes_check CHECK ((((prize_type = 'tokens'::text) AND (amount_tokens IS NOT NULL) AND (amount_cop IS NULL)) OR ((prize_type = 'cop'::text) AND (amount_cop IS NOT NULL) AND (amount_tokens IS NULL)) OR ((prize_type = 'both'::text) AND (amount_tokens IS NOT NULL) AND (amount_cop IS NOT NULL)))); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_tournament_id_user_profile_id_key UNIQUE (tournament_id, user_profile_id);  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'cancelled'::text, 'attended'::text, 'no_show'::text]))); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_results    ADD CONSTRAINT tournament_results_tournament_id_position_key UNIQUE (tournament_id, "position");                       EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_results    ADD CONSTRAINT tournament_results_tournament_id_user_profile_id_key UNIQUE (tournament_id, user_profile_id);           EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_results    ADD CONSTRAINT tournament_results_position_check CHECK ((("position" >= 1) AND ("position" <= 3)));                    EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournaments           ADD CONSTRAINT tournaments_slug_key UNIQUE (slug);                                                                     EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournaments           ADD CONSTRAINT tournaments_location_type_check CHECK ((location_type = ANY (ARRAY['presencial'::text, 'online'::text, 'mixto'::text]))); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournaments           ADD CONSTRAINT tournaments_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'live'::text, 'completed'::text]))); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.user_profiles         ADD CONSTRAINT user_profiles_privy_user_id_unique UNIQUE (privy_user_id);                                              EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

-- Foreign keys
DO $$ BEGIN ALTER TABLE public.academia_content          ADD CONSTRAINT academia_content_course_id_fkey            FOREIGN KEY (course_id)       REFERENCES public.courses(id)              ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_bracket_id_fkey            FOREIGN KEY (bracket_id)      REFERENCES public.brackets(id)             ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_loser_id_fkey              FOREIGN KEY (loser_id)        REFERENCES public.bracket_participants(id) ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_next_loser_match_id_fkey   FOREIGN KEY (next_loser_match_id) REFERENCES public.bracket_matches(id)   ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_next_match_id_fkey         FOREIGN KEY (next_match_id)   REFERENCES public.bracket_matches(id)      ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_p1_id_fkey                 FOREIGN KEY (p1_id)           REFERENCES public.bracket_participants(id) ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_p1_source_match_id_fkey    FOREIGN KEY (p1_source_match_id) REFERENCES public.bracket_matches(id)    ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_p2_id_fkey                 FOREIGN KEY (p2_id)           REFERENCES public.bracket_participants(id) ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_p2_source_match_id_fkey    FOREIGN KEY (p2_source_match_id) REFERENCES public.bracket_matches(id)    ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_matches          ADD CONSTRAINT bracket_matches_winner_id_fkey             FOREIGN KEY (winner_id)       REFERENCES public.bracket_participants(id) ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_participants     ADD CONSTRAINT bracket_participants_bracket_id_fkey       FOREIGN KEY (bracket_id)      REFERENCES public.brackets(id)             ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.bracket_participants     ADD CONSTRAINT bracket_participants_user_profile_id_fkey  FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)         ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.brackets                 ADD CONSTRAINT brackets_tournament_id_fkey                FOREIGN KEY (tournament_id)   REFERENCES public.tournaments(id)          ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.competitions             ADD CONSTRAINT competitions_player_id_fkey                FOREIGN KEY (player_id)       REFERENCES public.players(id)              ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.course_modules           ADD CONSTRAINT course_modules_course_id_fkey              FOREIGN KEY (course_id)       REFERENCES public.courses(id)              ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.course_session_documents ADD CONSTRAINT course_session_documents_session_id_fkey   FOREIGN KEY (session_id)      REFERENCES public.course_sessions(id)      ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.course_session_links     ADD CONSTRAINT course_session_links_session_id_fkey       FOREIGN KEY (session_id)      REFERENCES public.course_sessions(id)      ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.course_sessions          ADD CONSTRAINT course_sessions_module_id_fkey             FOREIGN KEY (module_id)       REFERENCES public.course_modules(id)       ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.courses                  ADD CONSTRAINT courses_master_id_fkey                     FOREIGN KEY (master_id)       REFERENCES public.masters(id)              ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.discount_rules           ADD CONSTRAINT discount_rules_aliado_id_fkey              FOREIGN KEY (aliado_id)       REFERENCES public.aliados(id)              ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.enrollments              ADD CONSTRAINT enrollments_bank_account_id_fkey           FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);                                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.enrollments              ADD CONSTRAINT enrollments_course_id_fkey                 FOREIGN KEY (course_id)       REFERENCES public.courses(id)              ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.enrollments              ADD CONSTRAINT enrollments_discount_rule_id_fkey          FOREIGN KEY (discount_rule_id) REFERENCES public.discount_rules(id)      ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.enrollments              ADD CONSTRAINT enrollments_user_profile_id_fkey           FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id);                                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.games                    ADD CONSTRAINT games_category_id_fkey                     FOREIGN KEY (category_id)     REFERENCES public.game_categories(id)      ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.international_tournaments ADD CONSTRAINT international_tournaments_game_id_fkey    FOREIGN KEY (game_id)         REFERENCES public.games(id)                ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_orders              ADD CONSTRAINT pass_orders_bank_account_id_fkey           FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);                                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_orders              ADD CONSTRAINT pass_orders_discount_rule_id_fkey          FOREIGN KEY (discount_rule_id) REFERENCES public.discount_rules(id)      ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.pass_orders              ADD CONSTRAINT pass_orders_user_profile_id_fkey           FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)         ON DELETE RESTRICT;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.recruitment_submissions  ADD CONSTRAINT recruitment_submissions_category_id_fkey   FOREIGN KEY (category_id)     REFERENCES public.game_categories(id);                              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.recruitment_submissions  ADD CONSTRAINT recruitment_submissions_game_id_fkey       FOREIGN KEY (game_id)         REFERENCES public.games(id);                                        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.token_purchase_orders    ADD CONSTRAINT token_purchase_orders_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id)        ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.token_purchase_orders    ADD CONSTRAINT token_purchase_orders_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)         ON DELETE RESTRICT;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_prizes        ADD CONSTRAINT tournament_prizes_tournament_id_fkey       FOREIGN KEY (tournament_id)   REFERENCES public.tournaments(id)          ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_tournament_id_fkey FOREIGN KEY (tournament_id)  REFERENCES public.tournaments(id)          ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_registrations ADD CONSTRAINT tournament_registrations_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)    ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_results       ADD CONSTRAINT tournament_results_tournament_id_fkey      FOREIGN KEY (tournament_id)   REFERENCES public.tournaments(id)          ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournament_results       ADD CONSTRAINT tournament_results_user_profile_id_fkey    FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)         ON DELETE CASCADE;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.tournaments              ADD CONSTRAINT tournaments_game_id_fkey                   FOREIGN KEY (game_id)         REFERENCES public.games(id)                ON DELETE SET NULL;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =====================================================================
-- NON-CONSTRAINT INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS bank_accounts_active_idx                 ON public.bank_accounts            (is_active, sort_order);
CREATE INDEX IF NOT EXISTS course_modules_course_id_sort_idx        ON public.course_modules           (course_id, sort_order);
CREATE INDEX IF NOT EXISTS course_session_documents_session_idx     ON public.course_session_documents (session_id, sort_order);
CREATE INDEX IF NOT EXISTS course_session_links_session_idx         ON public.course_session_links     (session_id, sort_order);
CREATE INDEX IF NOT EXISTS course_sessions_module_id_sort_idx       ON public.course_sessions          (module_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS pass_orders_one_pending_per_user  ON public.pass_orders              (user_profile_id) WHERE (status = 'pending_tx'::pass_order_status);
CREATE UNIQUE INDEX IF NOT EXISTS pass_orders_tx_hash_uniq          ON public.pass_orders              ((lower(tx_hash)));
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_tx_hash_uniq          ON public.enrollments              ((lower(tx_hash))) WHERE (tx_hash IS NOT NULL);
CREATE INDEX IF NOT EXISTS pass_orders_user_expiry_idx              ON public.pass_orders              (user_profile_id, expires_at DESC) WHERE (status = 'confirmed'::pass_order_status);
CREATE UNIQUE INDEX IF NOT EXISTS token_purchase_orders_one_pending_per_user ON public.token_purchase_orders (user_profile_id) WHERE (status = 'pending'::token_purchase_status);
CREATE INDEX IF NOT EXISTS token_purchase_orders_privy_idx          ON public.token_purchase_orders    (privy_user_id);
CREATE INDEX IF NOT EXISTS token_purchase_orders_status_idx         ON public.token_purchase_orders    (status, created_at DESC);
CREATE INDEX IF NOT EXISTS token_purchase_orders_user_idx           ON public.token_purchase_orders    (user_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_prizes_tournament         ON public.tournament_prizes        (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tour_reg_tournament                  ON public.tournament_registrations (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tour_reg_user                        ON public.tournament_registrations (user_profile_id);
CREATE INDEX IF NOT EXISTS idx_tour_results_user                    ON public.tournament_results       (user_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pass_status            ON public.user_profiles            (pass_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address         ON public.user_profiles            (wallet_address) WHERE (wallet_address IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_uq         ON public.user_profiles            (username) WHERE (username IS NOT NULL);


-- =====================================================================
-- FUNCTIONS
-- All `CREATE OR REPLACE FUNCTION` — idempotent by construction.
-- =====================================================================

-- Note: `SET search_path` added on top of the live function (which the
-- Supabase security advisor flagged as `function_search_path_mutable`).
-- This is the only behavior change in the baseline vs. the live schema; it
-- has no functional effect at call time but eliminates the advisor warning.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_pass_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE user_profiles
  SET pass_status = CASE
    WHEN EXISTS (
      SELECT 1 FROM pass_orders
      WHERE user_profile_id = NEW.user_profile_id
        AND status = 'confirmed'
        AND expires_at > now()
    ) THEN 'active'::pass_status_enum
    WHEN EXISTS (
      SELECT 1 FROM pass_orders
      WHERE user_profile_id = NEW.user_profile_id
        AND status = 'confirmed'
    ) THEN 'expired'::pass_status_enum
    ELSE 'never'::pass_status_enum
  END
  WHERE id = NEW.user_profile_id;
  RETURN NEW;
END;
$$;

-- `register_for_tournament` body lives in migration
-- 20260522232128_gate_register_for_tournament_on_upcoming_status.sql,
-- which runs *after* this baseline. The body shown here is a no-op
-- placeholder so a fresh DB can call the function before the later
-- migration runs (Supabase applies migrations in timestamp order).
CREATE OR REPLACE FUNCTION public.register_for_tournament(
  tour_id   integer,
  user_pid  integer,
  privy_uid text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t   tournaments%ROWTYPE;
  cnt integer;
BEGIN
  SELECT * INTO t FROM tournaments WHERE id = tour_id;
  IF NOT FOUND                  THEN RETURN '{"ok":false,"reason":"not_found"}'::jsonb;   END IF;
  IF NOT t.is_active            THEN RETURN '{"ok":false,"reason":"not_active"}'::jsonb;  END IF;
  IF NOT t.is_registration_open THEN RETURN '{"ok":false,"reason":"closed"}'::jsonb;      END IF;
  IF t.status <> 'upcoming'     THEN RETURN '{"ok":false,"reason":"not_active"}'::jsonb;  END IF;

  IF t.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO cnt
    FROM tournament_registrations
    WHERE tournament_id = tour_id AND status NOT IN ('cancelled');
    IF cnt >= t.max_participants THEN RETURN '{"ok":false,"reason":"full"}'::jsonb; END IF;
  END IF;

  BEGIN
    INSERT INTO tournament_registrations (tournament_id, user_profile_id, privy_user_id)
    VALUES (tour_id, user_pid, privy_uid);
  EXCEPTION WHEN unique_violation THEN
    RETURN '{"ok":false,"reason":"already_registered"}'::jsonb;
  END;

  RETURN '{"ok":true}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_match_result(
  p_match_id bigint,
  p_p1_score integer,
  p_p2_score integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_match      bracket_matches%ROWTYPE;
  v_winner_id  bigint;
  v_loser_id   bigint;
BEGIN
  SELECT * INTO v_match FROM bracket_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'match not found'); END IF;
  IF v_match.state = 'completed' THEN RETURN jsonb_build_object('ok', false, 'reason', 'match already completed'); END IF;
  IF v_match.p1_id IS NULL OR v_match.p2_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'match not ready — missing participant');
  END IF;
  IF p_p1_score = p_p2_score THEN RETURN jsonb_build_object('ok', false, 'reason', 'tie scores not allowed'); END IF;

  IF p_p1_score > p_p2_score THEN
    v_winner_id := v_match.p1_id;
    v_loser_id  := v_match.p2_id;
  ELSE
    v_winner_id := v_match.p2_id;
    v_loser_id  := v_match.p1_id;
  END IF;

  UPDATE bracket_matches SET
    p1_score   = p_p1_score,
    p2_score   = p_p2_score,
    winner_id  = v_winner_id,
    loser_id   = v_loser_id,
    state      = 'completed',
    updated_at = now()
  WHERE id = p_match_id;

  IF v_match.next_loser_match_id IS NULL THEN
    UPDATE bracket_participants SET eliminated = true WHERE id = v_loser_id;
  END IF;

  IF v_match.next_match_id IS NOT NULL THEN
    IF v_match.next_match_slot = 1 THEN
      UPDATE bracket_matches
      SET p1_id = v_winner_id,
          state = CASE WHEN p2_id IS NOT NULL THEN 'ready'::match_state ELSE 'pending'::match_state END,
          updated_at = now()
      WHERE id = v_match.next_match_id;
    ELSE
      UPDATE bracket_matches
      SET p2_id = v_winner_id,
          state = CASE WHEN p1_id IS NOT NULL THEN 'ready'::match_state ELSE 'pending'::match_state END,
          updated_at = now()
      WHERE id = v_match.next_match_id;
    END IF;
  END IF;

  IF v_match.next_loser_match_id IS NOT NULL THEN
    IF v_match.next_loser_slot = 1 THEN
      UPDATE bracket_matches
      SET p1_id = v_loser_id,
          state = CASE WHEN p2_id IS NOT NULL THEN 'ready'::match_state ELSE 'pending'::match_state END,
          updated_at = now()
      WHERE id = v_match.next_loser_match_id;
    ELSE
      UPDATE bracket_matches
      SET p2_id = v_loser_id,
          state = CASE WHEN p1_id IS NOT NULL THEN 'ready'::match_state ELSE 'pending'::match_state END,
          updated_at = now()
      WHERE id = v_match.next_loser_match_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'winner_id', v_winner_id, 'loser_id', v_loser_id);
END;
$$;


-- =====================================================================
-- FUNCTION EXECUTE GRANTS
-- These SECURITY DEFINER functions must never be callable via PostgREST
-- (`/rest/v1/rpc/<name>`) by anon/authenticated. The app calls them with
-- the service-role key only. Revoking EXECUTE closes the
-- `anon_security_definer_function_executable` advisor warning.
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.report_match_result(bigint, integer, integer)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_for_tournament(integer, integer, text)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_pass_status()                                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                                           FROM PUBLIC, anon, authenticated;


-- =====================================================================
-- TRIGGERS — drop-then-create for idempotency
-- =====================================================================

DROP TRIGGER IF EXISTS trg_bracket_matches_updated_at ON public.bracket_matches;
CREATE TRIGGER trg_bracket_matches_updated_at BEFORE UPDATE ON public.bracket_matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_brackets_updated_at ON public.brackets;
CREATE TRIGGER trg_brackets_updated_at BEFORE UPDATE ON public.brackets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_course_modules_updated_at ON public.course_modules;
CREATE TRIGGER trg_course_modules_updated_at BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_course_sessions_updated_at ON public.course_sessions;
CREATE TRIGGER trg_course_sessions_updated_at BEFORE UPDATE ON public.course_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sync_pass_status ON public.pass_orders;
CREATE TRIGGER trg_sync_pass_status AFTER INSERT OR UPDATE ON public.pass_orders FOR EACH ROW EXECUTE FUNCTION public.sync_user_pass_status();


-- =====================================================================
-- VIEWS
-- =====================================================================
CREATE OR REPLACE VIEW public.hall_of_fame AS
  SELECT up.id AS user_profile_id,
         up.username,
         up.nombre,
         up.apellidos,
         count(*) FILTER (WHERE tr."position" = 1) AS gold_count,
         count(*) FILTER (WHERE tr."position" = 2) AS silver_count,
         count(*) FILTER (WHERE tr."position" = 3) AS bronze_count,
         COALESCE(sum(tr.points), 0::bigint)       AS total_points
    FROM public.user_profiles up
    JOIN public.tournament_results tr ON tr.user_profile_id = up.id
   GROUP BY up.id, up.username, up.nombre, up.apellidos
   ORDER BY COALESCE(sum(tr.points), 0::bigint) DESC,
            count(*) FILTER (WHERE tr."position" = 1) DESC;


-- =====================================================================
-- ROW-LEVEL SECURITY — enable on every table
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is a no-op if already on.
-- =====================================================================
ALTER TABLE public.academia_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aliados                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_session_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_session_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_info                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_benefits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_config               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_prizes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles             ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- POLICIES — drop-then-create for idempotency
-- All policies in the live schema are SELECT-only PERMISSIVE; writes go
-- through the service-role `supabaseAdmin` client which bypasses RLS.
-- =====================================================================

DROP POLICY IF EXISTS authenticated_read_published_content ON public.academia_content;
CREATE POLICY authenticated_read_published_content ON public.academia_content
  FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS aliados_public_read ON public.aliados;
CREATE POLICY aliados_public_read ON public.aliados
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS bank_accounts_public_read ON public.bank_accounts;
CREATE POLICY bank_accounts_public_read ON public.bank_accounts
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS public_read_matches ON public.bracket_matches;
CREATE POLICY public_read_matches ON public.bracket_matches
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.brackets b
     WHERE b.id = bracket_matches.bracket_id
       AND b.status = ANY (ARRAY['published'::bracket_status, 'in_progress'::bracket_status, 'completed'::bracket_status])
  ));

DROP POLICY IF EXISTS public_read_participants ON public.bracket_participants;
CREATE POLICY public_read_participants ON public.bracket_participants
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.brackets b
     WHERE b.id = bracket_participants.bracket_id
       AND b.status = ANY (ARRAY['published'::bracket_status, 'in_progress'::bracket_status, 'completed'::bracket_status])
  ));

DROP POLICY IF EXISTS public_read_brackets ON public.brackets;
CREATE POLICY public_read_brackets ON public.brackets
  FOR SELECT TO public
  USING (status = ANY (ARRAY['published'::bracket_status, 'in_progress'::bracket_status, 'completed'::bracket_status]));

DROP POLICY IF EXISTS public_read ON public.competitions;
CREATE POLICY public_read ON public.competitions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS course_modules_public_read ON public.course_modules;
CREATE POLICY course_modules_public_read ON public.course_modules
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id AND c.is_active = true
  ));

DROP POLICY IF EXISTS course_sessions_public_read ON public.course_sessions;
CREATE POLICY course_sessions_public_read ON public.course_sessions
  FOR SELECT TO anon, authenticated
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id
     WHERE m.id = course_sessions.module_id AND m.is_published = true AND c.is_active = true
  ));

DROP POLICY IF EXISTS public_read ON public.courses;
CREATE POLICY public_read ON public.courses FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS public_read ON public.floor_info;
CREATE POLICY public_read ON public.floor_info FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON public.game_categories;
CREATE POLICY public_read ON public.game_categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON public.games;
CREATE POLICY public_read ON public.games FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read intl tournaments" ON public.international_tournaments;
CREATE POLICY "public read intl tournaments" ON public.international_tournaments
  FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS public_read_active_masters ON public.masters;
CREATE POLICY public_read_active_masters ON public.masters
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS public_read ON public.pass_benefits;
CREATE POLICY public_read ON public.pass_benefits FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON public.pass_config;
CREATE POLICY public_read ON public.pass_config FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON public.players;
CREATE POLICY public_read ON public.players FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS public_read ON public.site_content;
CREATE POLICY public_read ON public.site_content FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON public.social_links;
CREATE POLICY public_read ON public.social_links FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read prizes" ON public.tournament_prizes;
CREATE POLICY "public read prizes" ON public.tournament_prizes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "user reads own registrations" ON public.tournament_registrations;
CREATE POLICY "user reads own registrations" ON public.tournament_registrations
  FOR SELECT TO public
  USING (privy_user_id = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text));

DROP POLICY IF EXISTS "public read results" ON public.tournament_results;
CREATE POLICY "public read results" ON public.tournament_results FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS public_read ON public.tournaments;
CREATE POLICY public_read ON public.tournaments FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS hall_of_fame_public_read ON public.user_profiles;
CREATE POLICY hall_of_fame_public_read ON public.user_profiles
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tournament_results tr WHERE tr.user_profile_id = tr.id
  ));

-- =====================================================================
-- END BASELINE
-- =====================================================================
