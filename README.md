## Drizzle workflow

- Prisma has been removed from the services layer.
- Every service now owns its own `src/db/schema.ts` and `drizzle.config.ts`.
- Database access should use Drizzle ORM with the local service schema.
- There is no centralized Prisma migration service anymore.
- Docker services start independently after Postgres/Redis are healthy.

### Service files

- `services/adminService/src/db/schema.ts`
- `services/authService/src/db/schema.ts`
- `services/userService/src/db/schema.ts`
- `services/subscriptionService/src/db/schema.ts`
- `services/videoService/src/db/schema.ts`
- `services/streamingService/src/db/schema.ts`
- `services/uploadService/src/db/schema.ts`

### Commands

- Generate Drizzle migrations for any service: `cd services/<serviceName> && npm run db:generate`
- Run Drizzle migrations for any service: `cd services/<serviceName> && npm run db:migrate`
