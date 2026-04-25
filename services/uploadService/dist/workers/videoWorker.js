import { Worker } from "bullmq";
import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, } from "@aws-sdk/client-s3";
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
import { uploads, uploadAssets, processingJobs, videoVariants, videos, videoAssets, } from "@digiiplex6112/db";
const AUDIO_ONLY_KINDS = ["MUSIC_TRACK"];
const isAudioOnly = (kind) => AUDIO_ONLY_KINDS.includes(kind);
const videoRenditions = [
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
];
const audioRenditions = [
    {
        label: "128k",
        bitrate: "128k",
        bandwidth: 128000,
        sampleRate: 44100,
        channels: 2,
    },
    {
        label: "320k",
        bitrate: "320k",
        bandwidth: 320000,
        sampleRate: 44100,
        channels: 2,
    },
];
const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
const clearDirectory = (dirPath) => {
    if (fs.existsSync(dirPath))
        fs.rmSync(dirPath, { recursive: true, force: true });
};
const collectFiles = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory())
            files.push(...collectFiles(fullPath));
        else
            files.push(fullPath);
    }
    return files;
};
const getContentType = (filePath) => {
    if (filePath.endsWith(".m3u8"))
        return "application/vnd.apple.mpegurl";
    if (filePath.endsWith(".ts"))
        return "video/MP2T";
    if (filePath.endsWith(".aac"))
        return "audio/aac";
    if (filePath.endsWith(".mp4"))
        return "video/mp4";
    return "application/octet-stream";
};
const deleteS3FolderByPrefix = async (prefix) => {
    let continuationToken;
    do {
        const listed = await s3.send(new ListObjectsV2Command({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        }));
        const keys = listed.Contents?.map((i) => i.Key).filter((k) => Boolean(k)) ?? [];
        if (keys.length) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: S3_CREDENTIAL.S3_BUCKET,
                Delete: { Objects: keys.map((k) => ({ Key: k })) },
            }));
        }
        continuationToken = listed.IsTruncated
            ? listed.NextContinuationToken
            : undefined;
    } while (continuationToken);
};
const transcodeVideoVariant = (inputPath, outputDir, rendition) => new Promise((resolve, reject) => {
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
        .on("error", (err) => reject(err))
        .run();
});
const transcodeAudioVariant = (inputPath, outputDir, rendition) => new Promise((resolve, reject) => {
    ensureDir(outputDir);
    ffmpeg(inputPath)
        .outputOptions([
        "-vn", // strip video stream
        "-c:a",
        "aac",
        "-b:a",
        rendition.bitrate,
        "-ar",
        String(rendition.sampleRate),
        "-ac",
        String(rendition.channels),
        "-hls_time",
        "10", // 10s segments — larger = fewer CDN requests
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        path.join(outputDir, "segment_%03d.aac"),
    ])
        .output(path.join(outputDir, "index.m3u8"))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
});
const uploadFolderToS3 = async (tempDir, processingPrefix, onProgress) => {
    const allFiles = collectFiles(tempDir);
    const uploadableFiles = allFiles.filter((f) => f.endsWith(".ts") ||
        f.endsWith(".m3u8") ||
        f.endsWith(".aac") ||
        f.endsWith(".mp4"));
    const totalFiles = uploadableFiles.length;
    let masterPlaylistUrl = "";
    for (let i = 0; i < totalFiles; i++) {
        const file = uploadableFiles[i];
        const fileBuffer = fs.readFileSync(file);
        const relativePath = path.relative(tempDir, file).replace(/\\/g, "/");
        const s3Key = `${processingPrefix}/${relativePath}`;
        await s3.send(new PutObjectCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: s3Key,
            Body: fileBuffer,
            ContentLength: fileBuffer.length,
            ContentType: getContentType(file),
            ACL: "public-read",
        }));
        if (relativePath === "master.m3u8") {
            masterPlaylistUrl = buildCdnFileUrl(s3Key);
        }
        await onProgress(i + 1, totalFiles);
    }
    return masterPlaylistUrl;
};
const processVideoJob = async (job, inputPath, tempDir, processingPrefix, processingJobId, updateProgress) => {
    const totalRenditions = videoRenditions.length;
    const transcodeStart = 5;
    const transcodeEnd = 85;
    const perRendition = (transcodeEnd - transcodeStart) / totalRenditions;
    // Transcode each rendition
    for (let i = 0; i < totalRenditions; i++) {
        const rendition = videoRenditions[i];
        const startPercent = Math.round(transcodeStart + i * perRendition);
        await updateProgress("transcoding", startPercent, {
            currentRendition: rendition.label,
            renditionsDone: i,
            totalRenditions,
            message: `Transcoding ${rendition.label}...`,
        });
        await transcodeVideoVariant(inputPath, path.join(tempDir, rendition.label), rendition);
        await updateProgress("transcoding", Math.round(transcodeStart + (i + 1) * perRendition), {
            currentRendition: rendition.label,
            renditionsDone: i + 1,
            totalRenditions,
            message: `${rendition.label} complete`,
        });
        await db
            .update(processingJobs)
            .set({
            progress: Math.round(((i + 1) / totalRenditions) * 80),
            updatedAt: new Date(),
        })
            .where(eq(processingJobs.id, processingJobId));
    }
    // Build master playlist
    const masterPlaylistContent = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        ...videoRenditions.flatMap((r) => [
            `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height}`,
            `${r.label}/index.m3u8`,
        ]),
        "",
    ].join("\n");
    fs.writeFileSync(path.join(tempDir, "master.m3u8"), masterPlaylistContent);
    // Upload to S3
    await updateProgress("uploading", 85, { message: "Uploading to S3..." });
    await deleteS3FolderByPrefix(processingPrefix);
    const masterPlaylistUrl = await uploadFolderToS3(tempDir, processingPrefix, async (uploaded, total) => {
        await updateProgress("uploading", Math.round(85 + (uploaded / total) * 13), {
            uploadedFiles: uploaded,
            totalFiles: total,
            message: `Uploading (${uploaded}/${total})...`,
        });
    });
    return { masterPlaylistUrl, renditions: videoRenditions };
};
const processAudioJob = async (job, inputPath, tempDir, processingPrefix, processingJobId, updateProgress) => {
    const totalRenditions = audioRenditions.length;
    const transcodeStart = 5;
    const transcodeEnd = 80;
    const perRendition = (transcodeEnd - transcodeStart) / totalRenditions;
    // Transcode each audio rendition
    for (let i = 0; i < totalRenditions; i++) {
        const rendition = audioRenditions[i];
        const startPercent = Math.round(transcodeStart + i * perRendition);
        await updateProgress("transcoding", startPercent, {
            currentRendition: rendition.label,
            renditionsDone: i,
            totalRenditions,
            message: `Transcoding audio ${rendition.label}...`,
        });
        await transcodeAudioVariant(inputPath, path.join(tempDir, rendition.label), rendition);
        await updateProgress("transcoding", Math.round(transcodeStart + (i + 1) * perRendition), {
            currentRendition: rendition.label,
            renditionsDone: i + 1,
            totalRenditions,
            message: `${rendition.label} complete`,
        });
    }
    // Build audio master playlist
    const masterPlaylistContent = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        ...audioRenditions.flatMap((r) => [
            `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},CODECS="mp4a.40.2"`,
            `${r.label}/index.m3u8`,
        ]),
        "",
    ].join("\n");
    fs.writeFileSync(path.join(tempDir, "master.m3u8"), masterPlaylistContent);
    // Upload to S3
    await updateProgress("uploading", 80, { message: "Uploading to S3..." });
    await deleteS3FolderByPrefix(processingPrefix);
    const masterPlaylistUrl = await uploadFolderToS3(tempDir, processingPrefix, async (uploaded, total) => {
        await updateProgress("uploading", Math.round(80 + (uploaded / total) * 18), {
            uploadedFiles: uploaded,
            totalFiles: total,
            message: `Uploading (${uploaded}/${total})...`,
        });
    });
    return { masterPlaylistUrl, renditions: audioRenditions };
};
// ─────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────
const worker = new Worker("video-processing", async (job) => {
    console.log("Job started:", job.id, job.data);
    const { fileUrl, uploadId, uploadAssetId, sourceKey, assetRole, processingPrefix, contentKind, showId, seasonNumber, episodeNumber, } = job.data;
    const kind = (contentKind ?? "MOVIE");
    const isMusic = isAudioOnly(kind);
    const tempDir = path.join("tmp", uploadId, assetRole);
    const inputExt = isMusic ? "mp3" : "mp4";
    const inputPath = path.join(tempDir, `input.${inputExt}`);
    clearDirectory(tempDir);
    ensureDir(tempDir);
    console.log("Temp dir:", tempDir, "| contentKind:", kind);
    // ── Progress helper ──────────────────────────────────────────
    const updateProgress = async (stage, percent, extra = {}) => {
        console.log(`[${kind}] ${stage} - ${percent}%`, extra);
        await job.updateProgress({ stage, percent, ...extra });
    };
    // ── 1. Insert processingJob row ──────────────────────────────
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
        // ── 2. Download source file ────────────────────────────────
        await updateProgress("downloading", 0, {
            message: "Downloading file...",
        });
        console.log("Downloading:", fileUrl);
        const response = await axios({
            url: fileUrl,
            method: "GET",
            responseType: "stream",
        });
        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });
        console.log("Download complete");
        await updateProgress("downloading", 5, { message: "Download complete" });
        // ── 3. Transcode + Upload based on content kind ────────────
        let masterPlaylistUrl = "";
        let usedRenditions = [];
        if (isMusic) {
            // MUSIC_TRACK: audio-only HLS
            const result = await processAudioJob(job, inputPath, tempDir, processingPrefix, processingJob.id, updateProgress);
            masterPlaylistUrl = result.masterPlaylistUrl;
            usedRenditions = result.renditions;
        }
        else {
            // MOVIE, SHORT, STANDUP, EPISODE, PODCAST_EP: video HLS
            const result = await processVideoJob(job, inputPath, tempDir, processingPrefix, processingJob.id, updateProgress);
            masterPlaylistUrl = result.masterPlaylistUrl;
            usedRenditions = result.renditions;
        }
        await updateProgress("finalizing", 98, {
            message: "Updating database...",
        });
        // ── 4. Save videoVariants (only for video kinds) ───────────
        if (!isMusic) {
            const baseUrl = masterPlaylistUrl.replace("master.m3u8", "");
            await db.insert(videoVariants).values(usedRenditions.map((r) => ({
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
            })));
            console.log("Video variants saved");
        }
        // ── 5. Update processingJob → COMPLETED ───────────────────
        await db
            .update(processingJobs)
            .set({
            status: "COMPLETED",
            progress: 100,
            masterPlaylistUrl,
            outputFormat: isMusic ? "HLS_AUDIO" : "HLS",
            completedAt: new Date(),
            updatedAt: new Date(),
        })
            .where(eq(processingJobs.id, processingJob.id));
        // ── 6. Update uploadAsset → APPROVED ──────────────────────
        await db
            .update(uploadAssets)
            .set({
            status: "PENDING_APPROVAL",
            masterPlaylistUrl,
            updatedAt: new Date(),
        })
            .where(eq(uploadAssets.id, uploadAssetId));
        // ── 7. Create streaming records ───────────────────────────
        if (assetRole === "MAIN") {
            const uploadRecord = await db
                .select()
                .from(uploads)
                .where(eq(uploads.id, uploadId))
                .limit(1)
                .then((res) => res[0]);
            if (!uploadRecord) {
                throw new Error(`Upload record not found for uploadId: ${uploadId}`);
            }
            const thumbnailAsset = await db
                .select()
                .from(uploadAssets)
                .where(and(eq(uploadAssets.uploadId, uploadId), eq(uploadAssets.assetRole, "THUMBNAIL")))
                .limit(1)
                .then((res) => res[0]);
            let video = await db
                .select()
                .from(videos)
                .where(eq(videos.uploadId, uploadId))
                .limit(1)
                .then((res) => res[0] ?? null);
            if (video) {
                const [updatedVideo] = await db
                    .update(videos)
                    .set({
                    title: uploadRecord.title,
                    description: uploadRecord.description ?? null,
                    maturityRating: uploadRecord.metadata?.ageRating ?? null,
                    genres: uploadRecord.metadata?.genres ?? [],
                    tags: uploadRecord.metadata?.tags ?? [],
                    cast: uploadRecord.metadata?.cast ?? [],
                    updatedAt: new Date(),
                })
                    .where(eq(videos.id, video.id))
                    .returning();
                video = updatedVideo;
                console.log("Video record updated:", video.id);
            }
            else {
                [video] = await db
                    .insert(videos)
                    .values({
                    uploadId,
                    title: uploadRecord.title,
                    description: uploadRecord.description ?? null,
                    status: "DRAFT",
                    maturityRating: uploadRecord.metadata?.ageRating ?? null,
                    genres: uploadRecord.metadata?.genres ?? [],
                    tags: uploadRecord.metadata?.tags ?? [],
                    cast: uploadRecord.metadata?.cast ?? [],
                })
                    .returning();
                console.log("Video record created:", video.id);
            }
            const existingMainAsset = await db
                .select()
                .from(videoAssets)
                .where(and(eq(videoAssets.videoId, video.id), eq(videoAssets.assetType, "MAIN")))
                .limit(1)
                .then((res) => res[0] ?? null);
            if (existingMainAsset) {
                await db
                    .update(videoAssets)
                    .set({
                    uploadAssetId,
                    streamingProtocol: "HLS",
                    masterPlaylistUrl,
                    thumbnailUrl: thumbnailAsset?.masterPlaylistUrl ?? null,
                    drmEnabled: false,
                    availableQualities: isMusic
                        ? usedRenditions.map((r) => r.label)
                        : usedRenditions.map((r) => r.label),
                    updatedAt: new Date(),
                })
                    .where(eq(videoAssets.id, existingMainAsset.id));
            }
            else {
                await db.insert(videoAssets).values({
                    videoId: video.id,
                    uploadAssetId,
                    // MUSIC_TRACK has no video so use MAIN for audio asset type too
                    assetType: "MAIN",
                    streamingProtocol: "HLS",
                    masterPlaylistUrl,
                    thumbnailUrl: thumbnailAsset?.masterPlaylistUrl ?? null,
                    drmEnabled: false,
                    availableQualities: isMusic
                        ? usedRenditions.map((r) => r.label)
                        : usedRenditions.map((r) => r.label),
                });
            }
            console.log("Main videoAsset created");
        }
        else if (assetRole === "TRAILER") {
            // Trailer only applies to MOVIE, SHORT, STANDUP
            const existingVideo = await db
                .select()
                .from(videos)
                .where(eq(videos.uploadId, uploadId))
                .limit(1)
                .then((res) => res[0] ?? null);
            if (existingVideo) {
                const existingTrailerAsset = await db
                    .select()
                    .from(videoAssets)
                    .where(and(eq(videoAssets.videoId, existingVideo.id), eq(videoAssets.assetType, "TRAILER")))
                    .limit(1)
                    .then((res) => res[0] ?? null);
                if (existingTrailerAsset) {
                    await db
                        .update(videoAssets)
                        .set({
                        uploadAssetId,
                        streamingProtocol: "HLS",
                        masterPlaylistUrl,
                        drmEnabled: false,
                        availableQualities: usedRenditions.map((r) => r.label),
                        updatedAt: new Date(),
                    })
                        .where(eq(videoAssets.id, existingTrailerAsset.id));
                }
                else {
                    await db.insert(videoAssets).values({
                        videoId: existingVideo.id,
                        uploadAssetId,
                        assetType: "TRAILER",
                        streamingProtocol: "HLS",
                        masterPlaylistUrl,
                        drmEnabled: false,
                        availableQualities: usedRenditions.map((r) => r.label),
                    });
                }
                console.log("Trailer videoAsset created/updated");
            }
        }
        // ── 8. Mark upload → READY ────────────────────────────────
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
            contentKind: kind,
        };
    }
    catch (error) {
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
    }
    finally {
        console.log("Cleaning temp folder:", tempDir);
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}, { connection });
console.log("Worker Started (video + audio)...");
//# sourceMappingURL=videoWorker.js.map