CREATE TYPE "public"."role" AS ENUM('user', 'creator', 'admin', 'super_admin');--> statement-breakpoint
ALTER TABLE "auth_service"."profile_genres" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_service"."profile_languages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "auth_service"."profile_genres" CASCADE;--> statement-breakpoint
DROP TABLE "auth_service"."profile_languages" CASCADE;--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."role";--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "auth_service"."profiles" ADD COLUMN "genres_ids" uuid[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "auth_service"."profiles" ADD COLUMN "languages_ids" uuid[] DEFAULT '{}';