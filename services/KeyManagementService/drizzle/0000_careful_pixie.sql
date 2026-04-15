CREATE SCHEMA "key_management_service";
--> statement-breakpoint
CREATE TABLE "key_management_service"."Key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kid" text NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "keys_kid_unique" ON "key_management_service"."Key" USING btree ("kid");--> statement-breakpoint
CREATE INDEX "keys_kid_idx" ON "key_management_service"."Key" USING btree ("kid");