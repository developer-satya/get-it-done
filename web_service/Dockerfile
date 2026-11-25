FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY web_service ./web_service
RUN npm run build

FROM httpd:2.4-alpine
COPY web_service/apache/httpd.conf /usr/local/apache2/conf/httpd.conf
COPY --from=build /app/web_service/dist/ /usr/local/apache2/htdocs/
EXPOSE 80
