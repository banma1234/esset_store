const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 로그 디렉터리 보장
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/** 메타를 사람이 읽기 좋게 직렬화 */
function stringifyMeta(meta) {
  try {
    const cloned = { ...meta };
    // 너무 긴 body 등은 필요 시 생략 처리 가능
    return Object.keys(cloned).length ? ` ${JSON.stringify(cloned)}` : '';
  } catch {
    return '';
  }
}

const consoleFormat = format.printf((info) => {
  const ts = info.timestamp;
  const level = info.level;
  const msg = info.message;
  const stack =
    info.stack || // info 자체에 스택이 있을 때
    (info.error && info.error.stack) || // { error: { stack } } 형태
    undefined;

  // 기타 메타(요청 컨텍스트 등)
  const { timestamp, level: _lv, message: _msg, stack: _st, ...rest } = info;
  const metaStr = stringifyMeta(rest);

  return stack
    ? `${ts} [${level}] ${msg}\n${stack}${metaStr ? `\nmeta:${metaStr}` : ''}`
    : `${ts} [${level}] ${msg}${metaStr ? `\nmeta:${metaStr}` : ''}`;
});

/** @type {import('winston').Logger} */
const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.errors({ stack: true }), // Error 객체 스택 자동 수집
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.json(),
  ),
  transports: [
    // 파일 회전(정보 이상)
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'app.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '14d',
      maxSize: '50m',
      level: 'info',
    }),
    // 파일 회전(에러 전용)
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '30d',
      maxSize: '50m',
      level: 'error',
    }),
    // 콘솔(개발/운영 공통 사용, 예외/리젝션도 여기로 출력)
    new transports.Console({
      handleExceptions: true, // ★ 콘솔에서도 예외 출력
      handleRejections: true, // ★ 콘솔에서도 리젝션 출력
      format: format.combine(format.colorize(), consoleFormat),
    }),
  ],
  // 파일로도 예외/리젝션 저장(기존 유지)
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'exceptions.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '30d',
      maxSize: '50m',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'rejections.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '30d',
      maxSize: '50m',
    }),
  ],
});

/**
 * @function httpStream
 * @description morgan의 스트림 인터페이스 구현체
 * - morgan이 생성한 한 줄 메시지를 info 레벨로 파일에 기록
 * @type {{ write: (message: string) => void }}
 */
const httpStream = {
  write: (message) => {
    // morgan은 개행 포함하여 전달 → trim
    logger.info(message.trim(), { scope: 'http' });
  },
};

module.exports = { logger, httpStream };
