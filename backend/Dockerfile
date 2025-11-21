# 크롬과 런타임 의존성이 모두 포함된 이미지
FROM ghcr.io/puppeteer/puppeteer:22.7.1

WORKDIR /usr/src/app

# 루트로 디렉터리/권한 준비
USER root
RUN mkdir -p /usr/src/app/logs && \
    chown -R pptruser:pptruser /usr/src/app

# 패키지 설치
COPY package*.json ./
RUN npm ci --omit=dev

# 소스 복사
COPY . .

# 실행 유저를 비-root로 전환
USER pptruser

# Puppeteer가 사용할 실행파일 경로 (이미지에 포함됨)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000
CMD ["npm","run","start"]
