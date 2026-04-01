import { Worker } from "bullmq";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import axios from "axios";
import { eq } from "drizzle-orm";
import { connection } from "../config/queue.js";
import { db } from "../config/db.js";
import { s3 } from "../config/s3.js";
import { S3_CREDENTIAL } from "../constants/constant.js";
import { buildProcessingAssetPrefix, buildS3FileUrl } from "../utils/storagePath.js";
import { movies, videoQualities, videos } from "../db/schema.js";

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

const ensureDir = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
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
      .on("error", (error: Error) => reject(error))
      .run();
  });

const collectFiles = (dirPath: string): string[] => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
};

const getContentType = (filePath: string) =>
  filePath.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/MP2T";

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoUrl, movieId, sourceKey, assetType } = job.data;
    const tempDir = path.join("tmp", movieId, assetType);
    const inputPath = path.join(tempDir, "input.mp4");
    ensureDir(tempDir);

    const updateProgress = async (
      stage: string,
      percent: number,
      extra: Record<string, unknown> = {},
    ) => {
      await job.updateProgress({ stage, percent, ...extra });
    };

    try {
      await updateProgress("downloading", 0, {
        message: "Downloading video...",
      });

      const response = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream",
      });
      const writer = fs.createWriteStream(inputPath);
      response.data.pipe(writer);
      await new Promise<void>((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      await updateProgress("downloading", 5, {
        message: "Download complete",
      });

      const totalRenditions = renditions.length;
      const transcodeStart = 5;
      const transcodeEnd = 85;
      const perRendition = (transcodeEnd - transcodeStart) / totalRenditions;

      for (let index = 0; index < totalRenditions; index += 1) {
        const rendition = renditions[index];
        const startPercent = Math.round(transcodeStart + index * perRendition);

        await updateProgress("transcoding", startPercent, {
          currentRendition: rendition.label,
          renditionsDone: index,
          totalRenditions,
          message: `Transcoding ${rendition.label}...`,
        });

        await transcodeVariant(
          inputPath,
          path.join(tempDir, rendition.label),
          rendition,
        );

        const donePercent = Math.round(
          transcodeStart + (index + 1) * perRendition,
        );
        await updateProgress("transcoding", donePercent, {
          currentRendition: rendition.label,
          renditionsDone: index + 1,
          totalRenditions,
          message: `${rendition.label} complete`,
        });
      }

      const masterPlaylistPath = path.join(tempDir, "master.m3u8");
      const masterPlaylist = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        ...renditions.flatMap((rendition) => [
          `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.width}x${rendition.height}`,
          `${rendition.label}/index.m3u8`,
        ]),
        "",
      ].join("\n");
      fs.writeFileSync(masterPlaylistPath, masterPlaylist);

      const files = collectFiles(tempDir);
      const uploadableFiles = files.filter(
        (file) => file.endsWith(".ts") || file.endsWith(".m3u8"),
      );
      const processingPrefix = buildProcessingAssetPrefix(sourceKey, assetType);
      const totalFiles = uploadableFiles.length;
      let playlistUrl = "";

      for (let index = 0; index < totalFiles; index += 1) {
        const file = uploadableFiles[index];
        const fileBuffer = fs.readFileSync(file);
        const relativePath = path.relative(tempDir, file).replace(/\\/g, "/");
        const key = `${processingPrefix}/${relativePath}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentLength: fileBuffer.length,
            ContentType: getContentType(file),
            ACL: "public-read",
          }),
        );

        if (relativePath === "master.m3u8") {
          playlistUrl = buildS3FileUrl(key);
        }

        const uploadPercent = Math.round(85 + ((index + 1) / totalFiles) * 13);
        await updateProgress("uploading", uploadPercent, {
          uploadedFiles: index + 1,
          totalFiles,
          message: `Uploading files (${index + 1}/${totalFiles})...`,
        });
      }

      await updateProgress("finalizing", 98, {
        message: "Updating database...",
      });

      await db
        .update(movies)
        .set({
          ...(assetType === "video"
            ? { videoUrl: playlistUrl }
            : { trailerUrl: playlistUrl }),
          updatedAt: new Date(),
        })
        .where(eq(movies.id, movieId));

      const [video] = await db
        .insert(videos)
        .values({
          movieId,
          type: assetType === "video" ? "MOVIE" : "TRAILER",
          masterUrl: playlistUrl,
          format: "HLS",
        })
        .returning();

      const baseUrl = playlistUrl.replace("master.m3u8", "");

      await db.insert(videoQualities).values(
        renditions.map((rendition) => ({
          videoId: video.id,
          quality: rendition.label,
          url: `${baseUrl}${rendition.label}/index.m3u8`,
          bitrate: rendition.bandwidth,
        })),
      );

      await updateProgress("completed", 100, {
        message: "Processing complete!",
        playlistUrl,
      });

      return { success: true, playlistUrl };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  },
  { connection },
);

console.log("Video Worker Started...");
