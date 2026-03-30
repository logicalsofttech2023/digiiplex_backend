## Prisma migration workflow

- `adminService` is the single source of truth for Prisma schema and migrations.
- Run schema changes and migrations only from `services/adminService`.
- Other services like `uploadService` should only regenerate their Prisma client from the admin schema with `npm run prisma:generate`.
- `services/uploadService` does not maintain its own Prisma schema anymore.

### Commands

- Admin migrate locally: `cd services/adminService && npm run prisma:migrate`
- Admin deploy migrations: `cd services/adminService && npm run prisma:deploy`
- Regenerate upload service client after schema changes: `cd services/uploadService && npm run prisma:generate`
