FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npm run db:generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/index.js"]
