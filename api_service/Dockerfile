FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY api_service ./api_service
COPY db_service/prisma ./db_service/prisma
RUN npx prisma generate --schema db_service/prisma/schema.prisma
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --schema db_service/prisma/schema.prisma --accept-data-loss=false && npm run start:api"]
