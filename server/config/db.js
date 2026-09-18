const mongoose = require('mongoose');
let connectionPromise;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('DB configuration error');
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(uri)
    .then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn.connection;
    })
    .catch((err) => {
      connectionPromise = null;
      console.error('connection error:', err.message);
      throw err;
    });

  return connectionPromise;
};

module.exports = connectDB;
