CREATE TABLE "upload_service"."shows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"creator_id" uuid,
	"title" text NOT NULL,
	"type" varchar(30),
	"genre_id" uuid
);
--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD COLUMN "show_id" uuid;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD COLUMN "season_number" integer;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD COLUMN "episode_number" integer;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD COLUMN "content_kind" varchar(20);--> statement-breakpoint
ALTER TABLE "upload_service"."shows" ADD CONSTRAINT "shows_creator_id_auth_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD CONSTRAINT "uploads_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "upload_service"."shows"("id") ON DELETE no action ON UPDATE no action;