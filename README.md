# Digiiplex Backend

Multi-service OTT/backend platform for Digiiplex. This repository contains the API gateway, domain services, Redis-backed workers, and media-processing pipeline used for creator onboarding, user authentication, movie upload, and HLS streaming preparation.

## What This Project Does

- Creator and admin management
- OTP-based auth and profile management
- Genre and language management
- Movie metadata creation
- Multipart video and trailer uploads to S3-compatible storage
- Async video processing with BullMQ + FFmpeg
- HLS output generation for multiple qualities
- API routing through Express Gateway

## Architecture

The project is split into multiple services:

| Service | Port | Responsibility |
| --- | --- | --- |
| `digiplex-gateway` | `8080` | Public API gateway and route proxy |
| `auth-service` | `3001` | OTP auth, profile creation, profile/language/genre selection |
| `user-service` | `3002` | User-related service layer |
| `subscription-service` | `3003` | Subscription-related service layer |
| `video-service` | `3004` | Video-related service layer |
| `streaming-service` | `3005` | Streaming-related service layer |
| `upload-service` | `3006` | Movie creation, multipart upload, thumbnail save, processing status |
| `admin-service` | `3007` | Admins, creators, genres, languages |
| `video-worker` | background | Converts uploaded media into HLS renditions |
| `redis` | `6379` | Queue and cache backend |

## Gateway Routes

Requests enter through the gateway and are proxied to internal services:

| Public Prefix | Internal Service |
| --- | --- |
| `/auth/*` | `auth-service` |
| `/user/*` | `user-service` |
| `/subscription/*` | `subscription-service` |
| `/video/*` | `video-service` |
| `/streaming/*` | `streaming-service` |
| `/upload/*` | `upload-service` |
| `/admin/*` | `admin-service` |

Example:

```text
http://localhost:8080/auth/send-otp
http://localhost:8080/admin/creators
http://localhost:8080/upload/createMovie
```

## Media Upload and Processing Flow

Current upload pipeline in the codebase works like this:

1. A movie record is created through `upload-service`.
2. Signed multipart upload URLs are generated for movie and trailer files.
3. Files are uploaded to S3-compatible object storage.
4. Upload completion pushes a BullMQ job into the `video-processing` queue.
5. `video-worker` downloads the source file, transcodes it with FFmpeg, and creates HLS outputs.
6. Renditions are generated for `360p`, `480p`, `720p`, and `1080p`.
7. Processed `.m3u8` and `.ts` files are uploaded back to object storage/CDN.
8. Final playlist URLs and quality records are saved in PostgreSQL via Drizzle ORM.

## Tech Stack

- Node.js
- TypeScript
- Express
- Express Gateway
- PostgreSQL
- Drizzle ORM
- Redis
- BullMQ
- FFmpeg
- AWS SDK S3 client for S3-compatible storage
- Bunny CDN integration
- Nodemailer

## Repository Structure

```text
.
|-- digiplex_gateway/
|   |-- config/
|   `-- server.js
|-- services/
|   |-- adminService/
|   |-- authService/
|   |-- streamingService/
|   |-- subscriptionService/
|   |-- uploadService/
|   |-- userService/
|   `-- videoService/
|-- packages/
|   `-- db/
`-- docker-compose.yml
```

## Prerequisites

Make sure these are installed before running the project:

- Node.js 20+
- npm
- Docker + Docker Compose
- Redis
- FFmpeg
- Access to a PostgreSQL database
- Access to an S3-compatible storage bucket

## Environment Variables

There is no single root `.env` in this repo. Each service expects its own environment configuration. At minimum, prepare env files for the services that use secrets directly, especially:

- `services/adminService/.env`
- `services/authService/.env`
- `services/uploadService/.env`

Important variables used in the current code:

### Shared / service-level

```env
PORT=
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
MONGO_URI=
```

### Upload and storage

```env
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
BUNNY_API_KEY=
BUNNY_VIDEO_CDN_URL=
BUNNY_VIDEO_PULL_ZONE_ID=
```

### Email worker

```env
SMTP_USER=
SMTP_PASS=
```

## Running with Docker

The fastest way to run the system is Docker Compose.

```bash
docker compose up -d --build
```

This starts:

- Redis
- All API services
- Gateway
- Video worker

After startup:

- Gateway: `http://localhost:8080`
- Redis: `localhost:6379`

Notes:

- The PostgreSQL container is currently commented out in [`docker-compose.yml`](/c:/Users/USER/Documents/Suraj/digiiplex_backend/docker-compose.yml), so the stack expects an external PostgreSQL database.
- Some services load extra values from their own `.env` files through Docker Compose.

## Running Services Locally

If you want to run services without Docker:

1. Install dependencies in each service folder.
2. Build or run each service individually.
3. Start Redis.
4. Start the upload worker separately.
5. Start the gateway after dependent services are available.

Typical commands per service:

```bash
npm install
npm run dev
```

Build/start flow:

```bash
npm run build
npm start
```

Useful service scripts found in the repo:

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run worker` for `adminService`

## Database and Migrations

The project uses Drizzle ORM and includes migration/config files inside services and `packages/db`.

Common migration commands:

```bash
npm run db:generate
npm run db:migrate
```

Run those inside the relevant service directory, for example:

- `services/authService`
- `services/adminService`
- `services/uploadService`
- `services/videoService`
- `services/streamingService`
- `services/subscriptionService`
- `services/userService`

## Main API Areas

### Auth service

Current routes include:

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/create-profile`
- `GET /auth/profiles`
- `GET /auth/profile/:profileId`
- `PUT /auth/profile/:profileId`
- `DELETE /auth/profile/:profileId`
- `POST /auth/select-languages`
- `POST /auth/select-genres`
- `GET /auth/me`

### Admin service

Current routes include:

- `POST /admin/admins`
- `POST /admin/admins/login`
- `GET /admin/admins`
- `POST /admin/creators`
- `POST /admin/creators/login`
- `GET /admin/creators`
- `GET /admin/creators/verify-email`
- `POST /admin/genres`
- `GET /admin/genres`
- `POST /admin/languages`
- `GET /admin/languages`

### Upload service

Current routes include:

- `POST /upload/createMovie`
- `POST /upload/getMultipartSignedUrl`
- `POST /upload/completeMultipartUpload`
- `POST /upload/saveThumbnail`
- `GET /upload/status/:movieId/:assetType`
- `GET /upload/getAllMovies`
- `GET /upload/getMovieById/:id`
- `DELETE /upload/deleteMovie`

## Current Workflow Summary

Based on the code and project notes, the intended product flow is:

- Admin creates and manages creators
- Creator receives email/credentials and logs in
- Creator uploads movie metadata, media, and thumbnail
- Media is stored in object storage
- Worker processes original media into adaptive HLS outputs
- Processed assets are served through CDN-compatible URLs

## Development Notes

- Gateway configuration is in [`digiplex_gateway/config/gateway.config.yml`](/c:/Users/USER/Documents/Suraj/digiiplex_backend/digiplex_gateway/config/gateway.config.yml).
- Docker orchestration is in [`docker-compose.yml`](/c:/Users/USER/Documents/Suraj/digiiplex_backend/docker-compose.yml).
- Upload processing logic is in [`services/uploadService/src/controllers/uploadController.ts`](/c:/Users/USER/Documents/Suraj/digiiplex_backend/services/uploadService/src/controllers/uploadController.ts).
- HLS worker logic is in [`services/uploadService/src/workers/videoWorker.ts`](/c:/Users/USER/Documents/Suraj/digiiplex_backend/services/uploadService/src/workers/videoWorker.ts).

## Status

This README reflects the current repository structure and implemented flows as of the existing codebase. If you add new service routes, env examples, or root workspace scripts later, update this file so setup stays easy for the next developer.
