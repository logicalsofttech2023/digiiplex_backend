import {
  pgSchema,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  real,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  varchar,
  date,
  inet,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Users } from "../AuthService/authSchema.js";
import { genres, languages } from "../AdminService/adminSchema.js";

// =====================================================
// UPLOAD SERVICE SCHEMA
// =====================================================
export const uploadService = pgSchema("upload_service");

// ──────────── ENUMS ────────────
export const uploadStatusEnum = pgEnum("upload_status", [
  "DRAFT",
  "IN_REVIEW",
  "READY",
  "REJECTED",
  "CANCELLED",
  "INITIATED",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "PENDING_UPLOAD",
  "UPLOADED",
  "PROCESSING",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
]);

export const assetTypeEnum = pgEnum("upload_asset_type", [
  "VIDEO",
  "AUDIO",
  "IMAGE",
  "SUBTITLE",
  "CAPTION",
]);

export const assetRoleEnum = pgEnum("upload_asset_role", [
  "MAIN",
  "TRAILER",
  "TEASER",
  "THUMBNAIL",
  "POSTER",
  "BACKDROP",
  "LOGO",
  "SUBTITLE_VTT",
  "SUBTITLE_SRT",
]);

export const ContentKindEnum = pgEnum("content_kind", [
  'MOVIE',
  'EPISODE',
  'PODCAST_EP',
  'MUSIC_TRACK',
  'SHORT',
  'STANDUP'
]);

// ──────────── UPLOADS ────────────
export const uploads = uploadService.table(
  "uploads",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),

    creatorId: uuid("creator_id")
      .notNull()
      .references(() => Users.id, { onDelete: "restrict" }),

    title: text("title").notNull(),
    description: text("description"),
    type: varchar("type", { length: 30 }),

    
    genreId: uuid("genre_id").references(() => genres.id, {
      onDelete: "set null",
    }),
    languageId: uuid("language_id").references(() => languages.id, {
      onDelete: "set null",
    }),

    defaultLanguage: varchar("default_language", { length: 10 }),
    status: uploadStatusEnum("status").notNull().default("INITIATED"),
    metadata: jsonb("metadata").default({}),
    errorMessage: text("error_message"),
    deletedFlg: boolean("deleted_flg").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    showId: uuid("show_id").references(() => shows.id),
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),
    contentKind: ContentKindEnum("content_kind"),
  },
  (t) => ({
    creatorIdIdx: index("idx_uploads_creator_id").on(t.creatorId),
    statusIdx: index("idx_uploads_status").on(t.status),
    createdAtIdx: index("idx_uploads_created_at").on(t.createdAt),
    creatorStatusIdx: index("idx_uploads_creator_status").on(
      t.creatorId,
      t.status
    ),
    genreIdx: index("idx_uploads_genre_id").on(t.genreId),
    languageIdx: index("idx_uploads_language_id").on(t.languageId),
  })
);

// ──────────── UPLOAD ASSETS ────────────
export const uploadAssets = uploadService.table(
  "upload_assets",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    assetType: assetTypeEnum("asset_type").notNull(),
    assetRole: assetRoleEnum("asset_role").notNull(),
    language: varchar("language", { length: 10 }),
    fileKey: text("file_key").notNull(),
    fileName: text("file_name"),
    contentType: text("content_type"),
    size: bigint("size", { mode: "number" }),
    checksum: text("checksum"),
    duration: integer("duration"),
    width: integer("width"),
    height: integer("height"),
    status: assetStatusEnum("status").notNull().default("PENDING_UPLOAD"),
    masterPlaylistUrl: text("master_playlist_url"),
    metadata: jsonb("metadata").default({}),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    version: integer("version").default(1),
    isLatest: boolean("is_latest").default(true),
    reason: text("reason"),
    deletedFlg: boolean("deleted_flg").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uploadIdIdx: index("idx_upload_assets_upload_id").on(t.uploadId),
    statusIdx: index("idx_upload_assets_status").on(t.status),
    roleIdx: index("idx_upload_assets_role").on(t.assetRole),
    uniqueAssetPerUpload: uniqueIndex("unique_asset_per_upload").on(
      t.uploadId,
      t.assetRole,
      t.language
    ),
  })
);

// ──────────── UPLOAD SESSIONS ────────────
export const uploadSessions = uploadService.table(
  "upload_sessions",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    uploadId: uuid("upload_id").references(() => uploads.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id, { onDelete: "cascade" }),
    fileKey: text("file_key").notNull(),
    totalSize: bigint("total_size", { mode: "number" }),
    uploadedSize: bigint("uploaded_size", { mode: "number" }).default(0),
    chunksReceived: jsonb("chunks_received").default([]),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("idx_upload_sessions_user_id").on(t.userId),
    expiresIdx: index("idx_upload_sessions_expires").on(t.expiresAt),
  })
);

export const shows = uploadService.table("shows", {
  id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
  creatorId: uuid("creator_id").references(() => Users.id),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }),
  genreId: uuid("genre_id"),
  languageId: uuid("language_id"),
  defaultLanguage: varchar("default_language", { length: 10 }),
  totalSeasons: integer("total_seasons").default(1),
  status: varchar("status", { length: 20 }).default("DRAFT"),
  metadata: jsonb("metadata").default({}),
  deletedFlg: boolean("deleted_flg").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ──────────── VALIDATION RULES ────────────
export const validationRules = uploadService.table("validation_rules", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  assetType: assetTypeEnum("asset_type").notNull(),
  maxSize: bigint("max_size", { mode: "number" }),
  allowedFormats: text("allowed_formats").array(),
  minDuration: integer("min_duration"),
  maxDuration: integer("max_duration"),
  requiredRoles: assetRoleEnum("required_roles").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──────────── ASSET AUDIT LOG ────────────
export const assetAuditLog = uploadService.table(
  "asset_audit_log",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    assetId: uuid("asset_id").notNull(),
    version: integer("version").notNull(),
    fileKey: text("file_key").notNull(),
    fileName: text("file_name"),
    contentType: text("content_type"),
    size: bigint("size", { mode: "number" }),
    checksum: text("checksum"),
    duration: integer("duration"),
    width: integer("width"),
    height: integer("height"),
    metadata: jsonb("metadata"),
    replacedAt: timestamp("replaced_at").defaultNow(),
    replacedByVersion: integer("replaced_by_version"),
    cleanupStatus: varchar("cleanup_status", { length: 20 }).default("PENDING"),
    cleanupScheduledAt: timestamp("cleanup_scheduled_at"),
    cleanupCompletedAt: timestamp("cleanup_completed_at"),
    cleanupError: text("cleanup_error"),
  },
  (t) => ({
    assetIdx: index("idx_asset_audit_asset").on(t.assetId),
    cleanupIdx: index("idx_asset_audit_cleanup").on(
      t.cleanupStatus,
      t.cleanupScheduledAt
    ),
    versionIdx: index("idx_asset_audit_version").on(t.assetId, t.version),
  })
);

// =====================================================
// TRANSCODER SERVICE SCHEMA
// =====================================================
export const transcoderService = pgSchema("transcoder_service");

// ──────────── ENUMS ────────────
export const jobStatusEnum = pgEnum("job_status", [
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "RETRYING",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "TRANSCODE",
  "THUMBNAIL",
  "SPRITE",
  "WATERMARK",
  "AUDIO_REMAP",
  "SUBTITLE_BURN",
]);

export const presetTypeEnum = pgEnum("preset_type", [
  "HLS_1080P",
  "HLS_720P",
  "HLS_480P",
  "HLS_360P",
  "HLS_240P",
  "DASH_4K",
  "DASH_1080P",
  "AUDIO_ONLY",
]);

// ──────────── PROCESSING JOBS ────────────
export const processingJobs = transcoderService.table(
  "processing_jobs",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    uploadId: uuid("upload_id").notNull(),
    uploadAssetId: uuid("upload_asset_id").notNull(),
    jobType: jobTypeEnum("job_type").notNull().default("TRANSCODE"),
    preset: presetTypeEnum("preset"),
    status: jobStatusEnum("status").notNull().default("PROCESSING"),
    priority: integer("priority").default(5),
    progress: integer("progress").default(0),

    // Input
    videoInputKey: text("video_input_key").notNull(),
    inputMetadata: jsonb("input_metadata").default({}),

    // Output
    masterPlaylistUrl: text("master_playlist_url"),
    outputManifestUrl: text("output_manifest_url"),
    outputFormat: varchar("output_format", { length: 20 }),

    // DRM
    drmEnabled: boolean("drm_enabled").default(false),
    drmSystem: varchar("drm_system", { length: 20 }),
    drmKeyId: uuid("drm_key_id"),
    drmContentKey: text("drm_content_key"),
    drmEncryptionMode: varchar("drm_encryption_mode", { length: 20 }),

    // FFmpeg
    ffmpegCommand: text("ffmpeg_command"),
    ffmpegPid: integer("ffmpeg_pid"),
    ffmpegLog: text("ffmpeg_log"),

    // Video metadata
    duration: integer("duration"),
    width: integer("width"),
    height: integer("height"),
    bitrate: integer("bitrate"),
    frameRate: real("frame_rate"),
    codec: varchar("codec", { length: 50 }),

    // Job management
    workerId: text("worker_id"),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    errorMessage: text("error_message"),
    errorDetails: jsonb("error_details"),

    // Timestamps
    queuedAt: timestamp("queued_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uploadIdIdx: index("idx_processing_jobs_upload_id").on(t.uploadId),
    statusIdx: index("idx_processing_jobs_status").on(t.status),
    priorityIdx: index("idx_processing_jobs_priority").on(t.priority, t.status),
    workerIdx: index("idx_processing_jobs_worker").on(t.workerId, t.status),
    createdIdx: index("idx_processing_jobs_created").on(t.createdAt),
  })
);

// ──────────── VIDEO VARIANTS ────────────
export const videoVariants = transcoderService.table(
  "video_variants",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    processingJobId: uuid("processing_job_id")
      .notNull()
      .references(() => processingJobs.id, { onDelete: "cascade" }),
    uploadId: uuid("upload_id"),
    uploadAssetId: uuid("upload_asset_id"),

    resolution: varchar("resolution", { length: 10 }),
    bitrate: integer("bitrate"),
    width: integer("width"),
    height: integer("height"),
    frameRate: real("frame_rate"),
    videoCodec: varchar("video_codec", { length: 50 }),
    audioCodec: varchar("audio_codec", { length: 50 }),
    audioBitrate: integer("audio_bitrate"),
    audioChannels: integer("audio_channels"),
    container: varchar("container", { length: 20 }),

    playlistUrl: text("playlist_url").notNull(),
    segmentsUrl: text("segments_url").array(),

    fileSize: bigint("file_size", { mode: "number" }),
    segmentDuration: integer("segment_duration"),
    totalSegments: integer("total_segments"),

    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    jobIdIdx: index("idx_video_variants_job_id").on(t.processingJobId),
    resolutionIdx: index("idx_video_variants_resolution").on(t.resolution),
  })
);

// ──────────── TRANSCODING PRESETS ────────────
export const transcodingPresets = transcoderService.table(
  "transcoding_presets",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    name: presetTypeEnum("name").unique().notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),

    videoCodec: varchar("video_codec", { length: 20 }).default("h264"),
    videoBitrate: integer("video_bitrate").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    frameRate: real("frame_rate").default(30),
    profile: varchar("profile", { length: 20 }).default("high"),
    level: varchar("level", { length: 10 }).default("4.0"),

    audioCodec: varchar("audio_codec", { length: 20 }).default("aac"),
    audioBitrate: integer("audio_bitrate").default(128),
    audioChannels: integer("audio_channels").default(2),
    sampleRate: integer("sample_rate").default(48000),

    isAdaptive: boolean("is_adaptive").default(false),
    adaptiveGroup: varchar("adaptive_group", { length: 50 }),

    container: varchar("container", { length: 20 }).default("m3u8"),
    segmentDuration: integer("segment_duration").default(6),
    isDefault: boolean("is_default").default(false),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ──────────── THUMBNAILS ────────────
export const thumbnails = transcoderService.table(
  "thumbnails",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    processingJobId: uuid("processing_job_id")
      .notNull()
      .references(() => processingJobs.id, { onDelete: "cascade" }),
    uploadId: uuid("upload_id").notNull(),
    uploadAssetId: uuid("upload_asset_id").notNull(),

    thumbnailType: varchar("thumbnail_type", { length: 20 }),
    timeOffset: integer("time_offset"),
    width: integer("width"),
    height: integer("height"),
    url: text("url").notNull(),

    spriteLayout: varchar("sprite_layout", { length: 20 }),
    totalThumbnails: integer("total_thumbnails"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uploadIdIdx: index("idx_thumbnails_upload_id").on(t.uploadId),
  })
);

// ──────────── QUEUE METRICS ────────────
export const queueMetrics = transcoderService.table(
  "queue_metrics",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    queueName: varchar("queue_name", { length: 50 }),
    totalJobs: integer("total_jobs"),
    processingJobs: integer("processing_jobs"),
    queuedJobs: integer("queued_jobs"),
    avgWaitTime: integer("avg_wait_time"),
    avgProcessingTime: integer("avg_processing_time"),
    recordedAt: timestamp("recorded_at").defaultNow(),
  },
  (t) => ({
    recordedIdx: index("idx_queue_metrics_recorded").on(t.recordedAt),
  })
);

// ──────────── FFMPEG TEMPLATES ────────────
export const ffmpegTemplates = transcoderService.table("ffmpeg_templates", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  description: text("description"),
  presetType: varchar("preset_type", { length: 30 }),
  templateCommand: text("template_command").notNull(),
  videoSettings: jsonb("video_settings"),
  audioSettings: jsonb("audio_settings"),
  drmSettings: jsonb("drm_settings"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =====================================================
// STREAMING SERVICE SCHEMA
// =====================================================
export const streamingService = pgSchema("streaming_service");

// ──────────── ENUMS ────────────
export const videoStatusEnum = pgEnum("video_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
  "DELETED",
  "BLOCKED",
]);

export const streamingAssetTypeEnum = pgEnum("streaming_asset_type", [
  "MAIN",
  "TRAILER",
  "TEASER",
  "THUMBNAIL",
  "POSTER",
  "BACKDROP",
]);

export const streamingProtocolEnum = pgEnum("streaming_protocol", [
  "HLS",
  "DASH",
  "CMAF",
]);

export const drmProviderEnum = pgEnum("drm_provider", [
  "WIDEVINE",
  "PLAYREADY",
  "FAIRPLAY",
  "CLEARKEY",
]);

// ──────────── VIDEOS ────────────
export const videos = streamingService.table(
  "videos",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    uploadId: uuid("upload_id").unique().notNull(),
    title: text("title").notNull(),
    description: text("description"),
    synopsis: text("synopsis"),
    status: videoStatusEnum("status").notNull().default("DRAFT"),

    releaseDate: date("release_date"),
    duration: integer("duration"),
    maturityRating: varchar("maturity_rating", { length: 10 }),
    genres: text("genres").array(),
    tags: text("tags").array(),

    cast: jsonb("cast").default([]),
    crew: jsonb("crew").default([]),

    availableFrom: timestamp("available_from"),
    availableTo: timestamp("available_to"),
    geoRestrictions: text("geo_restrictions").array(),

    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    uploadIdIdx: index("idx_videos_upload_id").on(t.uploadId),
    statusIdx: index("idx_videos_status").on(t.status),
    genresIdx: index("idx_videos_genres").on(t.genres),
    releaseDateIdx: index("idx_videos_release_date").on(t.releaseDate),
    availableIdx: index("idx_videos_available").on(t.availableFrom, t.availableTo),
  })
);

// ──────────── VIDEO ASSETS ────────────
export const videoAssets = streamingService.table(
  "video_assets",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    uploadAssetId: uuid("upload_asset_id"),
    assetType: streamingAssetTypeEnum("asset_type").notNull(),
    language: varchar("language", { length: 10 }),

    streamingProtocol: streamingProtocolEnum("streaming_protocol").default("HLS"),
    masterPlaylistUrl: text("master_playlist_url").notNull(),
    manifestUrl: text("manifest_url"),
    thumbnailUrl: text("thumbnail_url"),
    posterUrl: text("poster_url"),

    drmEnabled: boolean("drm_enabled").default(true),
    drmProvider: drmProviderEnum("drm_provider").default("WIDEVINE"),
    drmKeyId: text("drm_key_id"),

    availableQualities: text("available_qualities").array(),
    audioTracks: jsonb("audio_tracks").default([]),
    subtitleTracks: jsonb("subtitle_tracks").default([]),

    size: bigint("size", { mode: "number" }),
    duration: integer("duration"),
    bitrate: integer("bitrate"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    videoIdIdx: index("idx_video_assets_video_id").on(t.videoId),
    typeIdx: index("idx_video_assets_type").on(t.assetType),
    uniqueVideoAsset: uniqueIndex("unique_video_asset").on(
      t.videoId,
      t.assetType,
      t.language
    ),
  })
);

// ──────────── SUBTITLE TRACKS ────────────
export const subtitleTracks = streamingService.table(
  "subtitle_tracks",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    videoAssetId: uuid("video_asset_id")
      .notNull()
      .references(() => videoAssets.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 10 }).notNull(),
    label: varchar("label", { length: 50 }),
    format: varchar("format", { length: 10 }).default("vtt"),
    url: text("url").notNull(),
    isDefault: boolean("is_default").default(false),
    isForced: boolean("is_forced").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    assetIdx: index("idx_subtitle_tracks_asset").on(t.videoAssetId),
    uniqueSubtitle: uniqueIndex("unique_subtitle_per_language").on(
      t.videoAssetId,
      t.language
    ),
  })
);

// ──────────── AUDIO TRACKS ────────────
export const audioTracks = streamingService.table(
  "audio_tracks",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    videoAssetId: uuid("video_asset_id")
      .notNull()
      .references(() => videoAssets.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 10 }).notNull(),
    label: varchar("label", { length: 50 }),
    codec: varchar("codec", { length: 20 }),
    bitrate: integer("bitrate"),
    channels: integer("channels"),
    url: text("url").notNull(),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    assetIdx: index("idx_audio_tracks_asset").on(t.videoAssetId),
    uniqueAudio: uniqueIndex("unique_audio_per_language").on(
      t.videoAssetId,
      t.language
    ),
  })
);

// ──────────── WATCH HISTORY ────────────
// Note: Partitioned by watched_at — partitions must be created manually in DB migrations
export const watchHistory = streamingService.table(
  "watch_history",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    videoAssetId: uuid("video_asset_id"),

    position: integer("position").default(0),
    duration: integer("duration"),
    completed: boolean("completed").default(false),

    deviceId: text("device_id"),
    deviceType: varchar("device_type", { length: 50 }),
    deviceInfo: jsonb("device_info").default({}),

    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    referrer: text("referrer"),

    watchedAt: timestamp("watched_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("idx_watch_history_user").on(t.userId, t.watchedAt),
    videoIdx: index("idx_watch_history_video").on(t.videoId, t.watchedAt),
    completedIdx: index("idx_watch_history_completed").on(t.userId, t.completed),
    uniqueWatch: uniqueIndex("unique_watch_per_user").on(
      t.userId,
      t.videoId,
      t.videoAssetId
    ),
  })
);

// ──────────── STREAMING SESSIONS ────────────
export const streamingSessions = streamingService.table(
  "streaming_sessions",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    videoAssetId: uuid("video_asset_id").notNull(),

    sessionToken: text("session_token").unique().notNull(),
    deviceId: text("device_id"),
    deviceInfo: jsonb("device_info").default({}),

    initialQuality: varchar("initial_quality", { length: 10 }),
    currentQuality: varchar("current_quality", { length: 10 }),
    adaptiveBitrateEnabled: boolean("adaptive_bitrate_enabled").default(true),

    clientIp: inet("client_ip"),
    cdnNode: text("cdn_node"),

    startedAt: timestamp("started_at").defaultNow().notNull(),
    lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),

    totalWatchTime: integer("total_watch_time").default(0),
    bufferingEvents: integer("buffering_events").default(0),
    qualitySwitches: integer("quality_switches").default(0),
  },
  (t) => ({
    userIdx: index("idx_streaming_sessions_user").on(t.userId, t.startedAt),
    tokenIdx: index("idx_streaming_sessions_token").on(t.sessionToken),
    activeIdx: index("idx_streaming_sessions_active").on(t.endedAt),
  })
);

// ──────────── CONTENT ANALYTICS ────────────
export const contentAnalytics = streamingService.table(
  "content_analytics",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    date: date("date").notNull(),

    views: integer("views").default(0),
    uniqueViewers: integer("unique_viewers").default(0),
    totalWatchTime: bigint("total_watch_time", { mode: "number" }).default(0),
    averageWatchTime: real("average_watch_time"),
    completionRate: real("completion_rate"),

    likes: integer("likes").default(0),
    dislikes: integer("dislikes").default(0),
    shares: integer("shares").default(0),
    comments: integer("comments").default(0),

    averageBitrate: integer("average_bitrate"),
    bufferingRatio: real("buffering_ratio"),
    errorRate: real("error_rate"),

    demographicData: jsonb("demographic_data").default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    videoDateIdx: index("idx_analytics_video_date").on(t.videoId, t.date),
    uniquePerDay: uniqueIndex("unique_analytics_per_day").on(t.videoId, t.date),
  })
);

// ──────────── USER PREFERENCES ────────────
export const userPreferences = streamingService.table("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => Users.id, { onDelete: "cascade" }),

  defaultLanguage: varchar("default_language", { length: 10 }),
  defaultQuality: varchar("default_quality", { length: 10 }),
  autoplayEnabled: boolean("autoplay_enabled").default(true),
  subtitlesEnabled: boolean("subtitles_enabled").default(false),
  subtitlesLanguage: varchar("subtitles_language", { length: 10 }),

  favoriteGenres: text("favorite_genres").array(),
  blockedCategories: text("blocked_categories").array(),

  parentalControlEnabled: boolean("parental_control_enabled").default(false),
  parentalControlPin: text("parental_control_pin"),
  allowedRatings: text("allowed_ratings").array(),

  shareWatchHistory: boolean("share_watch_history").default(true),
  personalizedRecommendations: boolean("personalized_recommendations").default(true),

  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});