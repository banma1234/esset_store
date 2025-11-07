FROM node:18-alpine
WORKDIR /usr/src/app

# 패키지 메타만 먼저 복사 → 캐시 최적화
COPY package*.json ./
RUN npm ci --omit=dev

# 소스 복사
COPY . .

# 환경변수(포트 등)
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# 건강검진 엔드포인트가 /health 라면, 추후 compose에서 healthcheck로 활용 가능
CMD ["npm", "run", "start"]
