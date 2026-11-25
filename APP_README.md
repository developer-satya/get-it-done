# Shadcn Admin

Shadcn Admin is a React/Tailwind admin dashboard backed by a Node API,
PostgreSQL, Prisma, and Apache. The complete application runs with Docker
Compose; no host-side Node or npm process is required.

## Service layout

```text
.
├── web_service/          React/Vite frontend, Apache configuration, and web Dockerfile
├── api_service/          Express API source and API Dockerfile
├── db_service/prisma/    PostgreSQL schema and migrations
└── docker-compose.yml    Connects the three services
```

`web_service` and `api_service` each build from their own Dockerfile. The
`db_service` uses the maintained `postgres:16-alpine` image, while owning the
Prisma schema and migration files that define its data. The API is the only
service allowed to connect to PostgreSQL; Apache proxies browser `/api` calls
to that private API container.

## Run with Docker Compose

```bash
cp .env.docker.example .env
# Edit .env and set strong POSTGRES_PASSWORD and SESSION_SECRET values.
docker compose up --build -d
```

Open `http://<server-ip>:${WEB_PORT:-9091}/`.

Apache serves the compiled frontend and proxies `/api/*` to the private API
container. PostgreSQL data is stored in the `app_postgres_data` Docker volume.

```bash
docker compose ps
docker compose logs -f api web
docker compose down
```

See [database.md](database.md) for schema, API endpoints, manual SQL
CRUD examples, backups, and CentOS firewall instructions.

## Preview

[Hosted demo](https://themewagon.github.io/shadcn-admin/)

## License

MIT. Design and code copyright Sat Naing and the development team; distributed
by ThemeWagon.
