CREATE TYPE "public"."MovieStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."VideoType" AS ENUM('MOVIE', 'TRAILER');--> statement-breakpoint
CREATE TABLE "Admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Admin_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "AuthUser" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"fullName" text,
	"dob" text,
	"role" text DEFAULT 'user' NOT NULL,
	"otp" text DEFAULT '' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"isVerified" boolean DEFAULT false,
	"isActive" boolean DEFAULT true,
	"isDeleted" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AuthUser_phone_unique" UNIQUE("phone"),
	CONSTRAINT "AuthUser_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Cast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"movieId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Creator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'creator',
	"emailVerified" boolean DEFAULT false NOT NULL,
	"emailVerificationToken" text,
	"emailVerificationExpires" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Creator_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "Genre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Genre_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "Language" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Language_name_unique" UNIQUE("name")
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
CREATE TABLE "Profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"profileName" text NOT NULL,
	"profileImg" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProfileGenre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profileId" uuid NOT NULL,
	"genreId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProfileLanguage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profileId" uuid NOT NULL,
	"languageId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"plan" text NOT NULL,
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
ALTER TABLE "Cast" ADD CONSTRAINT "Cast_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_AuthUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."AuthUser"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileGenre" ADD CONSTRAINT "ProfileGenre_profileId_Profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileLanguage" ADD CONSTRAINT "ProfileLanguage_profileId_Profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Video" ADD CONSTRAINT "Video_movieId_Movie_id_fk" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VideoQuality" ADD CONSTRAINT "VideoQuality_videoId_Video_id_fk" FOREIGN KEY ("videoId") REFERENCES "public"."Video"("id") ON DELETE cascade ON UPDATE no action;