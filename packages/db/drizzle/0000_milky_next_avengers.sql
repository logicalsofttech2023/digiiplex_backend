CREATE SCHEMA "auth_service";
--> statement-breakpoint
CREATE SCHEMA "admin_service";
--> statement-breakpoint
CREATE SCHEMA "streaming_service";
--> statement-breakpoint
CREATE SCHEMA "transcoder_service";
--> statement-breakpoint
CREATE SCHEMA "upload_service";
--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('MOBILE', 'WEB', 'TV', 'TABLET', 'CONSOLE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."profile_role" AS ENUM('ADULT', 'KID', 'TEEN', 'SENIOR');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('EMAIL', 'GOOGLE', 'FACEBOOK', 'APPLE', 'PHONE');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('USER', 'CREATOR', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."upload_asset_role" AS ENUM('MAIN', 'TRAILER', 'TEASER', 'THUMBNAIL', 'POSTER', 'BACKDROP', 'LOGO', 'SUBTITLE_VTT', 'SUBTITLE_SRT');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."upload_asset_type" AS ENUM('VIDEO', 'AUDIO', 'IMAGE', 'SUBTITLE', 'CAPTION');--> statement-breakpoint
CREATE TYPE "public"."drm_provider" AS ENUM('WIDEVINE', 'PLAYREADY', 'FAIRPLAY', 'CLEARKEY');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('TRANSCODE', 'THUMBNAIL', 'SPRITE', 'WATERMARK', 'AUDIO_REMAP', 'SUBTITLE_BURN');--> statement-breakpoint
CREATE TYPE "public"."preset_type" AS ENUM('HLS_1080P', 'HLS_720P', 'HLS_480P', 'HLS_360P', 'HLS_240P', 'DASH_4K', 'DASH_1080P', 'AUDIO_ONLY');--> statement-breakpoint
CREATE TYPE "public"."streaming_asset_type" AS ENUM('MAIN', 'TRAILER', 'TEASER', 'THUMBNAIL', 'POSTER', 'BACKDROP');--> statement-breakpoint
CREATE TYPE "public"."streaming_protocol" AS ENUM('HLS', 'DASH', 'CMAF');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('DRAFT', 'IN_REVIEW', 'READY', 'REJECTED', 'CANCELLED', 'INITIATED');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED', 'BLOCKED');--> statement-breakpoint



CREATE TABLE "auth_service"."auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text,
	"email" text,
	"password" text,
	"auth_provider" "auth_provider" DEFAULT 'PHONE',
	"dob" text,
	"role" "role" DEFAULT 'USER',
	"otp" text,
	"expires_at" timestamp,
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_service"."profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profile_name" text NOT NULL,
	"profile_img" text,
	"profile_role" "profile_role" DEFAULT 'ADULT' NOT NULL,
	"device_type" "device_type" DEFAULT 'UNKNOWN' NOT NULL,
	"genres_ids" uuid[] DEFAULT '{}',
	"languages_ids" uuid[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_service"."genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_service"."languages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_service"."asset_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text,
	"content_type" text,
	"size" bigint,
	"checksum" text,
	"duration" integer,
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"replaced_at" timestamp DEFAULT now(),
	"replaced_by_version" integer,
	"cleanup_status" varchar(20) DEFAULT 'PENDING',
	"cleanup_scheduled_at" timestamp,
	"cleanup_completed_at" timestamp,
	"cleanup_error" text
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."audio_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_asset_id" uuid NOT NULL,
	"language" varchar(10) NOT NULL,
	"label" varchar(50),
	"codec" varchar(20),
	"bitrate" integer,
	"channels" integer,
	"url" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."content_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"date" date NOT NULL,
	"views" integer DEFAULT 0,
	"unique_viewers" integer DEFAULT 0,
	"total_watch_time" bigint DEFAULT 0,
	"average_watch_time" real,
	"completion_rate" real,
	"likes" integer DEFAULT 0,
	"dislikes" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"average_bitrate" integer,
	"buffering_ratio" real,
	"error_rate" real,
	"demographic_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcoder_service"."ffmpeg_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"preset_type" varchar(30),
	"template_command" text NOT NULL,
	"video_settings" jsonb,
	"audio_settings" jsonb,
	"drm_settings" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ffmpeg_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "transcoder_service"."processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"upload_asset_id" uuid NOT NULL,
	"job_type" "job_type" DEFAULT 'TRANSCODE' NOT NULL,
	"preset" "preset_type",
	"status" "job_status" DEFAULT 'PROCESSING' NOT NULL,
	"priority" integer DEFAULT 5,
	"progress" integer DEFAULT 0,
	"video_input_key" text NOT NULL,
	"input_metadata" jsonb DEFAULT '{}'::jsonb,
	"master_playlist_url" text,
	"output_manifest_url" text,
	"output_format" varchar(20),
	"drm_enabled" boolean DEFAULT false,
	"drm_system" varchar(20),
	"drm_key_id" uuid,
	"drm_content_key" text,
	"drm_encryption_mode" varchar(20),
	"ffmpeg_command" text,
	"ffmpeg_pid" integer,
	"ffmpeg_log" text,
	"duration" integer,
	"width" integer,
	"height" integer,
	"bitrate" integer,
	"frame_rate" real,
	"codec" varchar(50),
	"worker_id" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"error_message" text,
	"error_details" jsonb,
	"queued_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcoder_service"."queue_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_name" varchar(50),
	"total_jobs" integer,
	"processing_jobs" integer,
	"queued_jobs" integer,
	"avg_wait_time" integer,
	"avg_processing_time" integer,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."streaming_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"video_asset_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"device_id" text,
	"device_info" jsonb DEFAULT '{}'::jsonb,
	"initial_quality" varchar(10),
	"current_quality" varchar(10),
	"adaptive_bitrate_enabled" boolean DEFAULT true,
	"client_ip" "inet",
	"cdn_node" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_heartbeat" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"total_watch_time" integer DEFAULT 0,
	"buffering_events" integer DEFAULT 0,
	"quality_switches" integer DEFAULT 0,
	CONSTRAINT "streaming_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."subtitle_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_asset_id" uuid NOT NULL,
	"language" varchar(10) NOT NULL,
	"label" varchar(50),
	"format" varchar(10) DEFAULT 'vtt',
	"url" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_forced" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcoder_service"."thumbnails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processing_job_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"upload_asset_id" uuid NOT NULL,
	"thumbnail_type" varchar(20),
	"time_offset" integer,
	"width" integer,
	"height" integer,
	"url" text NOT NULL,
	"sprite_layout" varchar(20),
	"total_thumbnails" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcoder_service"."transcoding_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" "preset_type" NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"video_codec" varchar(20) DEFAULT 'h264',
	"video_bitrate" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"frame_rate" real DEFAULT 30,
	"profile" varchar(20) DEFAULT 'high',
	"level" varchar(10) DEFAULT '4.0',
	"audio_codec" varchar(20) DEFAULT 'aac',
	"audio_bitrate" integer DEFAULT 128,
	"audio_channels" integer DEFAULT 2,
	"sample_rate" integer DEFAULT 48000,
	"is_adaptive" boolean DEFAULT false,
	"adaptive_group" varchar(50),
	"container" varchar(20) DEFAULT 'm3u8',
	"segment_duration" integer DEFAULT 6,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transcoding_presets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "upload_service"."upload_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"asset_type" "upload_asset_type" NOT NULL,
	"asset_role" "upload_asset_role" NOT NULL,
	"language" varchar(10),
	"file_key" text NOT NULL,
	"file_name" text,
	"content_type" text,
	"size" bigint,
	"checksum" text,
	"duration" integer,
	"width" integer,
	"height" integer,
	"status" "asset_status" DEFAULT 'PENDING_UPLOAD' NOT NULL,
	"master_playlist_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"version" integer DEFAULT 1,
	"is_latest" boolean DEFAULT true,
	"reason" text,
	"deleted_flg" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_service"."upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid,
	"user_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"total_size" bigint,
	"uploaded_size" bigint DEFAULT 0,
	"chunks_received" jsonb DEFAULT '[]'::jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_service"."uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" varchar(30),
	"genre_id" uuid,
	"language_id" uuid,
	"default_language" varchar(10),
	"status" "upload_status" DEFAULT 'INITIATED' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"deleted_flg" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"default_language" varchar(10),
	"default_quality" varchar(10),
	"autoplay_enabled" boolean DEFAULT true,
	"subtitles_enabled" boolean DEFAULT false,
	"subtitles_language" varchar(10),
	"favorite_genres" text[],
	"blocked_categories" text[],
	"parental_control_enabled" boolean DEFAULT false,
	"parental_control_pin" text,
	"allowed_ratings" text[],
	"share_watch_history" boolean DEFAULT true,
	"personalized_recommendations" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_service"."validation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" "upload_asset_type" NOT NULL,
	"max_size" bigint,
	"allowed_formats" text[],
	"min_duration" integer,
	"max_duration" integer,
	"required_roles" "upload_asset_role"[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."video_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"upload_asset_id" uuid,
	"asset_type" "streaming_asset_type" NOT NULL,
	"language" varchar(10),
	"streaming_protocol" "streaming_protocol" DEFAULT 'HLS',
	"master_playlist_url" text NOT NULL,
	"manifest_url" text,
	"thumbnail_url" text,
	"poster_url" text,
	"drm_enabled" boolean DEFAULT true,
	"drm_provider" "drm_provider" DEFAULT 'WIDEVINE',
	"drm_key_id" text,
	"available_qualities" text[],
	"audio_tracks" jsonb DEFAULT '[]'::jsonb,
	"subtitle_tracks" jsonb DEFAULT '[]'::jsonb,
	"size" bigint,
	"duration" integer,
	"bitrate" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcoder_service"."video_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processing_job_id" uuid NOT NULL,
	"upload_id" uuid,
	"upload_asset_id" uuid,
	"resolution" varchar(10),
	"bitrate" integer,
	"width" integer,
	"height" integer,
	"frame_rate" real,
	"video_codec" varchar(50),
	"audio_codec" varchar(50),
	"audio_bitrate" integer,
	"audio_channels" integer,
	"container" varchar(20),
	"playlist_url" text NOT NULL,
	"segments_url" text[],
	"file_size" bigint,
	"segment_duration" integer,
	"total_segments" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"synopsis" text,
	"status" "video_status" DEFAULT 'DRAFT' NOT NULL,
	"release_date" date,
	"duration" integer,
	"maturity_rating" varchar(10),
	"genres" text[],
	"tags" text[],
	"cast" jsonb DEFAULT '[]'::jsonb,
	"crew" jsonb DEFAULT '[]'::jsonb,
	"available_from" timestamp,
	"available_to" timestamp,
	"geo_restrictions" text[],
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "videos_upload_id_unique" UNIQUE("upload_id")
);
--> statement-breakpoint
CREATE TABLE "streaming_service"."watch_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"video_asset_id" uuid,
	"position" integer DEFAULT 0,
	"duration" integer,
	"completed" boolean DEFAULT false,
	"device_id" text,
	"device_type" varchar(50),
	"device_info" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"referrer" text,
	"watched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_service"."profiles" ADD CONSTRAINT "profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."audio_tracks" ADD CONSTRAINT "audio_tracks_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "streaming_service"."video_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."content_analytics" ADD CONSTRAINT "content_analytics_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "streaming_service"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."streaming_sessions" ADD CONSTRAINT "streaming_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."streaming_sessions" ADD CONSTRAINT "streaming_sessions_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "streaming_service"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."subtitle_tracks" ADD CONSTRAINT "subtitle_tracks_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "streaming_service"."video_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcoder_service"."thumbnails" ADD CONSTRAINT "thumbnails_processing_job_id_processing_jobs_id_fk" FOREIGN KEY ("processing_job_id") REFERENCES "transcoder_service"."processing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."upload_assets" ADD CONSTRAINT "upload_assets_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "upload_service"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."upload_sessions" ADD CONSTRAINT "upload_sessions_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "upload_service"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."upload_sessions" ADD CONSTRAINT "upload_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD CONSTRAINT "uploads_creator_id_auth_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD CONSTRAINT "uploads_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "admin_service"."genres"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_service"."uploads" ADD CONSTRAINT "uploads_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "admin_service"."languages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."video_assets" ADD CONSTRAINT "video_assets_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "streaming_service"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcoder_service"."video_variants" ADD CONSTRAINT "video_variants_processing_job_id_processing_jobs_id_fk" FOREIGN KEY ("processing_job_id") REFERENCES "transcoder_service"."processing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."watch_history" ADD CONSTRAINT "watch_history_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth_service"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_service"."watch_history" ADD CONSTRAINT "watch_history_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "streaming_service"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "auth_service"."auth_users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "auth_service"."auth_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "auth_service"."auth_users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_otp_idx" ON "auth_service"."auth_users" USING btree ("otp");--> statement-breakpoint
CREATE INDEX "profiles_user_idx" ON "auth_service"."profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_name_unique" ON "admin_service"."genres" USING btree ("name");--> statement-breakpoint
CREATE INDEX "genres_name_idx" ON "admin_service"."genres" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "languages_name_unique" ON "admin_service"."languages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "languages_name_idx" ON "admin_service"."languages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_asset_audit_asset" ON "upload_service"."asset_audit_log" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_audit_cleanup" ON "upload_service"."asset_audit_log" USING btree ("cleanup_status","cleanup_scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_asset_audit_version" ON "upload_service"."asset_audit_log" USING btree ("asset_id","version");--> statement-breakpoint
CREATE INDEX "idx_audio_tracks_asset" ON "streaming_service"."audio_tracks" USING btree ("video_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_audio_per_language" ON "streaming_service"."audio_tracks" USING btree ("video_asset_id","language");--> statement-breakpoint
CREATE INDEX "idx_analytics_video_date" ON "streaming_service"."content_analytics" USING btree ("video_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_analytics_per_day" ON "streaming_service"."content_analytics" USING btree ("video_id","date");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_upload_id" ON "transcoder_service"."processing_jobs" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_status" ON "transcoder_service"."processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_priority" ON "transcoder_service"."processing_jobs" USING btree ("priority","status");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_worker" ON "transcoder_service"."processing_jobs" USING btree ("worker_id","status");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_created" ON "transcoder_service"."processing_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_queue_metrics_recorded" ON "transcoder_service"."queue_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_streaming_sessions_user" ON "streaming_service"."streaming_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_streaming_sessions_token" ON "streaming_service"."streaming_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_streaming_sessions_active" ON "streaming_service"."streaming_sessions" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX "idx_subtitle_tracks_asset" ON "streaming_service"."subtitle_tracks" USING btree ("video_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_subtitle_per_language" ON "streaming_service"."subtitle_tracks" USING btree ("video_asset_id","language");--> statement-breakpoint
CREATE INDEX "idx_thumbnails_upload_id" ON "transcoder_service"."thumbnails" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_upload_assets_upload_id" ON "upload_service"."upload_assets" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_upload_assets_status" ON "upload_service"."upload_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upload_assets_role" ON "upload_service"."upload_assets" USING btree ("asset_role");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_asset_per_upload" ON "upload_service"."upload_assets" USING btree ("upload_id","asset_role","language");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_user_id" ON "upload_service"."upload_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_expires" ON "upload_service"."upload_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_uploads_creator_id" ON "upload_service"."uploads" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_status" ON "upload_service"."uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_uploads_created_at" ON "upload_service"."uploads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_uploads_creator_status" ON "upload_service"."uploads" USING btree ("creator_id","status");--> statement-breakpoint
CREATE INDEX "idx_uploads_genre_id" ON "upload_service"."uploads" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "idx_uploads_language_id" ON "upload_service"."uploads" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "idx_video_assets_video_id" ON "streaming_service"."video_assets" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "idx_video_assets_type" ON "streaming_service"."video_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_video_asset" ON "streaming_service"."video_assets" USING btree ("video_id","asset_type","language");--> statement-breakpoint
CREATE INDEX "idx_video_variants_job_id" ON "transcoder_service"."video_variants" USING btree ("processing_job_id");--> statement-breakpoint
CREATE INDEX "idx_video_variants_resolution" ON "transcoder_service"."video_variants" USING btree ("resolution");--> statement-breakpoint
CREATE INDEX "idx_videos_upload_id" ON "streaming_service"."videos" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "idx_videos_status" ON "streaming_service"."videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_videos_genres" ON "streaming_service"."videos" USING btree ("genres");--> statement-breakpoint
CREATE INDEX "idx_videos_release_date" ON "streaming_service"."videos" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "idx_videos_available" ON "streaming_service"."videos" USING btree ("available_from","available_to");--> statement-breakpoint
CREATE INDEX "idx_watch_history_user" ON "streaming_service"."watch_history" USING btree ("user_id","watched_at");--> statement-breakpoint
CREATE INDEX "idx_watch_history_video" ON "streaming_service"."watch_history" USING btree ("video_id","watched_at");--> statement-breakpoint
CREATE INDEX "idx_watch_history_completed" ON "streaming_service"."watch_history" USING btree ("user_id","completed");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_watch_per_user" ON "streaming_service"."watch_history" USING btree ("user_id","video_id","video_asset_id");