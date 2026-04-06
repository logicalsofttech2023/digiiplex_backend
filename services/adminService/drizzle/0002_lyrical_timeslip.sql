ALTER TABLE "admin_service"."Admin" RENAME TO "admins";--> statement-breakpoint
ALTER TABLE "admin_service"."Creator" RENAME TO "creators";--> statement-breakpoint
ALTER TABLE "admin_service"."Genre" RENAME TO "genres";--> statement-breakpoint
ALTER TABLE "admin_service"."Language" RENAME TO "languages";--> statement-breakpoint
ALTER TABLE "admin_service"."admins" DROP CONSTRAINT "Admin_email_unique";--> statement-breakpoint
ALTER TABLE "admin_service"."creators" DROP CONSTRAINT "Creator_email_unique";--> statement-breakpoint
ALTER TABLE "admin_service"."genres" DROP CONSTRAINT "Genre_name_unique";--> statement-breakpoint
ALTER TABLE "admin_service"."languages" DROP CONSTRAINT "Language_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admin_service"."admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admins_email_idx" ON "admin_service"."admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "creators_email_unique" ON "admin_service"."creators" USING btree ("email");--> statement-breakpoint
CREATE INDEX "creators_email_idx" ON "admin_service"."creators" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_name_unique" ON "admin_service"."genres" USING btree ("name");--> statement-breakpoint
CREATE INDEX "genres_name_idx" ON "admin_service"."genres" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "languages_name_unique" ON "admin_service"."languages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "languages_name_idx" ON "admin_service"."languages" USING btree ("name");