const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

// 간단한 재시도 로직 포함
async function connectMongo(retry = 0) {
  if (!MONGO_URI) throw new Error('MONGO_URI is not set');
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      // 옵션은 최신 mongoose 기본값으로 충분
      // serverSelectionTimeoutMS: 5000,
    });
    console.log('[Mongo] connected:', MONGO_URI);
  } catch (err) {
    const MAX = 10;
    const delay = Math.min(1000 * (retry + 1), 5000);
    console.error(`[Mongo] connect error (${retry + 1}/${MAX}):`, err.message);
    if (retry < MAX) {
      await new Promise((r) => setTimeout(r, delay));
      return connectMongo(retry + 1);
    }
    throw err;
  }
}

// 연결 상태 헬퍼
function mongoHealth() {
  // 0=disconnected,1=connected,2=connecting,3=disconnecting,99=uninitialized
  const map = { 0: 'down', 1: 'up', 2: 'connecting', 3: 'disconnecting' };
  const state = mongoose.connection.readyState;
  return { status: map[state] || 'unknown', readyState: state };
}

// 종료 시 그레이스풀 셧다운
function setupMongoShutdown() {
  const close = async () => {
    try { await mongoose.connection.close(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}

module.exports = { connectMongo, mongoHealth, setupMongoShutdown };
