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
CREATE TABLE "Profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"profileName" text NOT NULL,
	"profileImg" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProfileGenre" ADD CONSTRAINT "ProfileGenre_profileId_Profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileLanguage" ADD CONSTRAINT "ProfileLanguage_profileId_Profile_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_AuthUser_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."AuthUser"("id") ON DELETE no action ON UPDATE no action;