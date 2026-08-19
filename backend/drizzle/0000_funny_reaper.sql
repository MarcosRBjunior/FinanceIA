CREATE TYPE "public"."category" AS ENUM('Alimentação', 'Mercado', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Serviços', 'Transferências', 'Renda', 'Taxas e Tarifas', 'Outros');--> statement-breakpoint
CREATE TYPE "public"."classification_source" AS ENUM('cache', 'rules', 'llm', 'human');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"category" "category" NOT NULL,
	"confidence" real NOT NULL,
	"source" "classification_source" NOT NULL,
	"reasoning" text,
	"model_version" text,
	"latency_ms" integer,
	"input_tokens" integer,
	"output_tokens" integer,
	"needs_review" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eval_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"expected_category" "category" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merchant_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"normalized_merchant" text NOT NULL,
	"category" "category" NOT NULL,
	"hit_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_cache_normalized_merchant_unique" UNIQUE("normalized_merchant")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"type" "transaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classifications" ADD CONSTRAINT "classifications_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "eval_labels" ADD CONSTRAINT "eval_labels_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
