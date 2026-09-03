CREATE TABLE "routine_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_version" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"confidence" varchar(50) NOT NULL,
	"breakdown" jsonb NOT NULL,
	"issues" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_analyses" ADD CONSTRAINT "routine_analyses_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_analyses" ADD CONSTRAINT "routine_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_analyses_routine_id_idx" ON "routine_analyses" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "routine_analyses_user_id_idx" ON "routine_analyses" USING btree ("user_id");