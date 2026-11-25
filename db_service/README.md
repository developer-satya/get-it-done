# Database service

PostgreSQL runs from the official `postgres:16-alpine` image configured in the
root `docker-compose.yml`. This directory owns the database contract:

- `prisma/schema.prisma` — tables and relations
- `prisma/migrations/` — reviewed schema migrations

The API service runs Prisma commands against these files. No custom database
Dockerfile is needed unless PostgreSQL itself needs custom extensions or a
custom server configuration.
