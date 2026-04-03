CREATE TYPE "public"."MovieStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."VideoType" AS ENUM('MOVIE', 'TRAILER');--> statement-breakpoint
CREATE TABLE "Cast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"movieId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Movie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"shortDescription" text,
	"slug" text NOT NULL,
	"genres" text[] NOT NULL,
	"language" text NOT NULL,
	"releaseYear" integer NOT NULL,
	"ageRating" text DEFAULT 'U/A' NOT NULL,
	"thumbnailUrl" text,
	"videoUrl" text,
	"trailerUrl" text,
	"duration" integer NOT NULL,
	"rating" numeric(3, 1),
	"totalViews" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"status" "MovieStatus" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Movie_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "VideoQuality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"videoId" uuid NOT NULL,
	"quality" text NOT NULL,
	"url" text NOT NULL,
	"size" integer,
	"bitrate" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Video" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movieId" uuid NOT NULL,
	"type" "VideoType" NOT NULL,
	"masterUrl" text,
	"format" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Cast" ADD CONSTRAINT "Cast_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VideoQuality" ADD CONSTRAINT "VideoQuality_videoId_Video_id_fk" FOREIGN KEY ("videoId") REFERENCES "public"."Video"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Video" ADD CONSTRAINT "Video_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;