CREATE SCHEMA "auth_service";
--> statement-breakpoint
CREATE TABLE "auth_service"."auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"full_name" text,
	"dob" text,
	"role" text DEFAULT 'user' NOT NULL,
	"otp" text,
	"expires_at" timestamp,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_service"."profile_genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_service"."profile_languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"language_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_service"."profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_name" text NOT NULL,
	"profile_img" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "AuthUser" CASCADE;--> statement-breakpoint
DROP TABLE "ProfileGenre" CASCADE;--> statement-breakpoint
DROP TABLE "ProfileLanguage" CASCADE;--> statement-breakpoint
DROP TABLE "Profile" CASCADE;--> statement-breakpoint
ALTER TABLE "auth_service"."profile_genres" ADD CONSTRAINT "profile_genres_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth_service"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_service"."profile_languages" ADD CONSTRAINT "profile_languages_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "auth_service"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_service"."profiles" ADD CONSTRAINT "profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "auth_service"."auth_users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "auth_service"."auth_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "auth_service"."auth_users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_otp_idx" ON "auth_service"."auth_users" USING btree ("otp");--> statement-breakpoint
CREATE INDEX "pg_profile_idx" ON "auth_service"."profile_genres" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "pl_profile_idx" ON "auth_service"."profile_languages" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profiles_user_idx" ON "auth_service"."profiles" USING btree ("user_id");