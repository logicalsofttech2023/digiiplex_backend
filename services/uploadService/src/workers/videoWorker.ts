import { Worker } from "bullmq";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import axios from "axios";
import { and, eq } from "drizzle-orm";
import { connection } from "../config/queue.js";
import { db } from "../config/db.js";
import { s3 } from "../config/s3.js";
import { S3_CREDENTIAL } from "../constants/constant.js";
import { buildCdnFileUrl } from "../utils/storagePath.js";
import {
  uploads,
  uploadAssets,
  processingJobs,
  videoVariants,
  videos,
  videoAssets,
} from "@digiiplex6112/db";

const renditions = [
  {
    label: "360p",
    width: 640,
    height: 360,
    videoBitrate: "800k",
    maxrate: "856k",
    bufsize: "1200k",
    audioBitrate: "96k",
    bandwidth: 896000,
  },
  {
    label: "480p",
    width: 854,
    height: 480,
    videoBitrate: "1400k",
    maxrate: "1498k",
    bufsize: "2100k",
    audioBitrate: "128k",
    bandwidth: 1528000,
  },
  {
    label: "720p",
    width: 1280,
    height: 720,
    videoBitrate: "2800k",
    maxrate: "2996k",
    bufsize: "4200k",
    audioBitrate: "128k",
    bandwidth: 2928000,
  },
  {
    label: "1080p",
    width: 1920,
    height: 1080,
    videoBitrate: "5000k",
    maxrate: "5350k",
    bufsize: "7500k",
    audioBitrate: "192k",
    bandwidth: 5192000,
  },
] as const;

const ensureDir = (dirPath: string) =>
  fs.mkdirSync(dirPath, { recursive: true });

const clearDirectory = (dirPath: string) => {
  if (fs.existsSync(dirPath))
    fs.rmSync(dirPath, { recursive: true, force: true });
};

const collectFiles = (dirPath: string): string[] => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
};

const getContentType = (filePath: string) =>
  filePath.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/MP2T";

const deleteS3FolderByPrefix = async (prefix: string) => {
  let continuationToken: string | undefined;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys =
      listed.Contents?.map((i) => i.Key).filter((k): k is string =>
        Boolean(k),
      ) ?? [];

    if (keys.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: S3_CREDENTIAL.S3_BUCKET,
          Delete: { Objects: keys.map((k) => ({ Key: k })) },
        }),
      );
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
};

const transcodeVariant = (
  inputPath: string,
  outputDir: string,
  rendition: (typeof renditions)[number],
) =>
  new Promise<void>((resolve, reject) => {
    ensureDir(outputDir);

    ffmpeg(inputPath)
      .outputOptions([
        "-vf",
        `scale=w=${rendition.width}:h=${rendition.height}:force_original_aspect_ratio=decrease,pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-profile:v",
        "main",
        "-crf",
        "20",
        "-sc_threshold",
        "0",
        "-g",
        "48",
        "-keyint_min",
        "48",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:v",
        rendition.videoBitrate,
        "-maxrate",
        rendition.maxrate,
        "-bufsize",
        rendition.bufsize,
        "-b:a",
        rendition.audioBitrate,
        "-hls_time",
        "6",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        path.join(outputDir, "segment_%03d.ts"),
      ])
      .output(path.join(outputDir, "index.m3u8"))
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });

// ─────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────
const worker = new Worker(
  "video-processing",
  async (job) => {
    console.log("Job started:", job.id, job.data);

    const {
      fileUrl,
      uploadId,
      uploadAssetId,
      sourceKey,
      assetRole,
      processingPrefix,
    } = job.data;

    const tempDir = path.join("tmp", uploadId, assetRole);
    const inputPath = path.join(tempDir, "input.mp4");

    clearDirectory(tempDir);
    ensureDir(tempDir);
    console.log("Temp dir:", tempDir);

    // ── Progress helper ──────────────────────────
    const updateProgress = async (
      stage: string,
      percent: number,
      extra: Record<string, unknown> = {},
    ) => {
      console.log(`${stage} - ${percent}%`, extra);
      await job.updateProgress({ stage, percent, ...extra });
    };

    // ── 1. Insert processingJob row ──────────────
    const [processingJob] = await db
      .insert(processingJobs)
      .values({
        uploadId,
        uploadAssetId,
        jobType: "TRANSCODE",
        status: "PROCESSING",
        videoInputKey: sourceKey,
        priority: assetRole === "MAIN" ? 1 : 5,
      })
      .returning();

    console.log("Processing job created:", processingJob.id);

    // Mark uploadAsset as PROCESSING
    await db
      .update(uploadAssets)
      .set({ status: "PROCESSING", updatedAt: new Date() })
      .where(eq(uploadAssets.id, uploadAssetId));

    try {
      await updateProgress("downloading", 0, {
        message: "Downloading video...",
      });
      console.log("Downloading:", fileUrl);

      const response = await axios({
        url: fileUrl,
        method: "GET",
        responseType: "stream",
      });
      const writer = fs.createWriteStream(inputPath);
      response.data.pipe(writer);
      await new Promise<void>((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log("Download complete");
      await updateProgress("downloading", 5, { message: "Download complete" });

      const totalRenditions = renditions.length;
      const transcodeStart = 5;
      const transcodeEnd = 85;
      const perRendition = (transcodeEnd - transcodeStart) / totalRenditions;

      for (let i = 0; i < totalRenditions; i++) {
        const rendition = renditions[i];
        const startPercent = Math.round(transcodeStart + i * perRendition);

        console.log(`Transcoding: ${rendition.label}`);
        await updateProgress("transcoding", startPercent, {
          currentRendition: rendition.label,
          renditionsDone: i,
          totalRenditions,
          message: `Transcoding ${rendition.label}...`,
        });

        await transcodeVariant(
          inputPath,
          path.join(tempDir, rendition.label),
          rendition,
        );

        console.log(`Done: ${rendition.label}`);
        await updateProgress(
          "transcoding",
          Math.round(transcodeStart + (i + 1) * perRendition),
          {
            currentRendition: rendition.label,
            renditionsDone: i + 1,
            totalRenditions,
            message: `${rendition.label} complete`,
          },
        );

        await db
          .update(processingJobs)
          .set({
            progress: Math.round(((i + 1) / totalRenditions) * 80),
            updatedAt: new Date(),
          })
          .where(eq(processingJobs.id, processingJob.id));
      }

      console.log("Creating master playlist");

      const masterPlaylistContent = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        ...renditions.flatMap((r) => [
          `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height}`,
          `${r.label}/index.m3u8`,
        ]),
        "",
      ].join("\n");

      fs.writeFileSync(
        path.join(tempDir, "master.m3u8"),
        masterPlaylistContent,
      );
      console.log("Master playlist created");

      const allFiles = collectFiles(tempDir);
      const uploadableFiles = allFiles.filter(
        (f) => f.endsWith(".ts") || f.endsWith(".m3u8"),
      );

      console.log("Files to upload:", uploadableFiles.length);
      console.log("Cleaning old S3 folder:", processingPrefix);
      await deleteS3FolderByPrefix(processingPrefix);

      const totalFiles = uploadableFiles.length;
      let masterPlaylistUrl = "";

      for (let i = 0; i < totalFiles; i++) {
        const file = uploadableFiles[i];
        const fileBuffer = fs.readFileSync(file);
        const relativePath = path.relative(tempDir, file).replace(/\\/g, "/");

        const s3Key = `${processingPrefix}/${relativePath}`;

        console.log(`Uploading: ${s3Key}`);

        await s3.send(
          new PutObjectCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: s3Key,
            Body: fileBuffer,
            ContentLength: fileBuffer.length,
            ContentType: getContentType(file),
            ACL: "public-read",
          }),
        );

        if (relativePath === "master.m3u8") {
          masterPlaylistUrl = buildCdnFileUrl(s3Key);
        }

        await updateProgress(
          "uploading",
          Math.round(85 + ((i + 1) / totalFiles) * 13),
          {
            uploadedFiles: i + 1,
            totalFiles,
            message: `Uploading (${i + 1}/${totalFiles})...`,
          },
        );
      }

      await updateProgress("finalizing", 98, {
        message: "Updating database...",
      });

      const baseUrl = masterPlaylistUrl.replace("master.m3u8", "");

      await db.insert(videoVariants).values(
        renditions.map((r) => ({
          processingJobId: processingJob.id,
          uploadId,
          uploadAssetId,
          resolution: r.label,
          bitrate: r.bandwidth,
          width: r.width,
          height: r.height,
          videoCodec: "h264",
          audioCodec: "aac",
          audioBitrate: parseInt(r.audioBitrate),
          audioChannels: 2,
          container: "m3u8",
          segmentDuration: 6,
          playlistUrl: `${baseUrl}${r.label}/index.m3u8`,
        })),
      );

      console.log("Video variants saved");

      await db
        .update(processingJobs)
        .set({
          status: "COMPLETED",
          progress: 100,
          masterPlaylistUrl,
          outputFormat: "HLS",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(processingJobs.id, processingJob.id));

      await db
        .update(uploadAssets)
        .set({ status: "APPROVED", masterPlaylistUrl, updatedAt: new Date() })
        .where(eq(uploadAssets.id, uploadAssetId));

      if (assetRole === "MAIN") {
        const uploadRecord = await db
          .select()
          .from(uploads)
          .where(eq(uploads.id, uploadId))
          .limit(1)
          .then((res) => res[0]);

        const thumbnailAsset = await db
          .select()
          .from(uploadAssets)
          .where(
            and(
              eq(uploadAssets.uploadId, uploadId),
              eq(uploadAssets.assetRole, "THUMBNAIL"),
            ),
          )
          .limit(1)
          .then((res) => res[0]);

        const [video] = await db
          .insert(videos)
          .values({
            uploadId,
            title: uploadRecord?.title ?? "Untitled",
            description: uploadRecord?.description ?? null,
            status: "DRAFT",
            maturityRating: (uploadRecord?.metadata as any)?.ageRating ?? null,
            genres: (uploadRecord?.metadata as any)?.genres ?? [],
            tags: (uploadRecord?.metadata as any)?.tags ?? [],
            cast: (uploadRecord?.metadata as any)?.cast ?? [],
          })
          .returning();

        console.log("Video record created:", video.id);

        await db.insert(videoAssets).values({
          videoId: video.id,
          uploadAssetId,
          assetType: "MAIN",
          streamingProtocol: "HLS",
          masterPlaylistUrl,
          thumbnailUrl: thumbnailAsset?.masterPlaylistUrl ?? null,
          drmEnabled: false,
          availableQualities: renditions.map((r) => r.label),
        });

        console.log("Main videoAsset created");
      } else if (assetRole === "TRAILER") {
        const existingVideo = await db.query.videos.findFirst({
          where: eq(videos.uploadId, uploadId),
        });

        if (existingVideo) {
          await db
            .insert(videoAssets)
            .values({
              videoId: existingVideo.id,
              uploadAssetId,
              assetType: "TRAILER",
              streamingProtocol: "HLS",
              masterPlaylistUrl,
              drmEnabled: false,
              availableQualities: renditions.map((r) => r.label),
            })
            .onConflictDoUpdate({
              target: [
                videoAssets.videoId,
                videoAssets.assetType,
                videoAssets.language,
              ],
              set: { masterPlaylistUrl, updatedAt: new Date() },
            });

          console.log("Trailer videoAsset created/updated");
        }
      }

      await db
        .update(uploads)
        .set({ status: "READY", updatedAt: new Date() })
        .where(eq(uploads.id, uploadId));

      await updateProgress("completed", 100, {
        message: "Processing complete!",
        masterPlaylistUrl,
      });
      console.log("Job completed:", masterPlaylistUrl);

      return {
        success: true,
        masterPlaylistUrl,
        processingJobId: processingJob.id,
      };
    } catch (error) {
      console.error("Job failed:", error);

      const errMsg = error instanceof Error ? error.message : String(error);

      await db
        .update(processingJobs)
        .set({ status: "FAILED", errorMessage: errMsg, updatedAt: new Date() })
        .where(eq(processingJobs.id, processingJob.id));
      await db
        .update(uploadAssets)
        .set({ status: "REJECTED", reason: errMsg, updatedAt: new Date() })
        .where(eq(uploadAssets.id, uploadAssetId));
      await db
        .update(uploads)
        .set({
          status: "REJECTED",
          errorMessage: errMsg,
          updatedAt: new Date(),
        })
        .where(eq(uploads.id, uploadId));

      throw error;
    } finally {
      console.log("Cleaning temp folder:", tempDir);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  },
  { connection },
);

console.log("Video Worker Started...");
