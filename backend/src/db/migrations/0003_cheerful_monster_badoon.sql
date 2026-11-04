CREATE TABLE "knowledge_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_health_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"has_consent" boolean DEFAULT false NOT NULL,
	"consent_date" timestamp with time zone,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"skin_conditions" jsonb DEFAULT '[]'::jsonb,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"previous_reactions" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_health_contexts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stated_preferences" jsonb DEFAULT '{}'::jsonb,
	"confirmed_sensitivities" jsonb DEFAULT '[]'::jsonb,
	"tried_products" jsonb DEFAULT '[]'::jsonb,
	"important_advice_given" jsonb DEFAULT '[]'::jsonb,
	"accepted_recommendations" jsonb DEFAULT '[]'::jsonb,
	"rejected_recommendations" jsonb DEFAULT '[]'::jsonb,
	"unresolved_questions" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_memories_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_health_contexts" ADD CONSTRAINT "user_health_contexts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_embeddings_source_idx" ON "knowledge_embeddings" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "user_health_contexts_user_id_idx" ON "user_health_contexts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_memories_user_id_idx" ON "user_memories" USING btree ("user_id");