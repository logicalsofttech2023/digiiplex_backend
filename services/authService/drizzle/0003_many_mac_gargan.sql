CREATE TYPE "public"."device_type" AS ENUM('MOBILE', 'WEB', 'TV', 'TABLET', 'CONSOLE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('ADULT', 'KID', 'TEEN', 'SENIOR');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('EMAIL', 'GOOGLE', 'FACEBOOK', 'APPLE', 'PHONE');--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ALTER COLUMN "role" SET DEFAULT 'USER'::text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'CREATOR', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ALTER COLUMN "role" SET DEFAULT 'USER'::"public"."role";--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "auth_service"."auth_users" ADD COLUMN "auth_provider" "auth_provider" DEFAULT 'PHONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_service"."profiles" ADD COLUMN "profile_role" "profile_role" DEFAULT 'ADULT' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_service"."profiles" ADD COLUMN "device_type" "device_type" DEFAULT 'UNKNOWN' NOT NULL;