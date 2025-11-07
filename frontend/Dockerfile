# ---------- build stage ----------
FROM node:18-alpine AS builder
WORKDIR /app

# 패키지 메타만 먼저 복사 → 캐시 최적화
COPY package*.json ./
RUN npm ci

# 실제 소스 복사 후 빌드
COPY . .
# 환경변수: 프로덕션 빌드
ENV NODE_ENV=production
RUN npm run build

# ---------- runtime stage ----------
FROM node:18-alpine AS runner
WORKDIR /app

# 런타임에 필요한 prod 의존성만 설치
COPY package*.json ./
RUN npm ci --omit=dev

# Nuxt 런타임 산출물 및 설정/정적파일만 복사
COPY --from=builder /app/.nuxt ./.nuxt
COPY --from=builder /app/static ./static
COPY --from=builder /app/nuxt.config.js ./nuxt.config.js
COPY --from=builder /app/assets ./assets
# 네트워크 바인딩
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
