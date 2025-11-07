module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  MONGO_URI: process.env.MONGO_URI,
};
