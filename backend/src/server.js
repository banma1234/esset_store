require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectMongo, setupMongoShutdown } = require('./config/mongo');

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectMongo();
    setupMongoShutdown();
    
    const server = http.createServer(app);
    server.listen(PORT, () => console.log(`[API] listening on ${PORT}`));
  } catch (err) {
    console.error('[BOOT] failed:', err);
    process.exit(1);
  }
})();
