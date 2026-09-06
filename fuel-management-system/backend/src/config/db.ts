import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    const connection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    logger.info(`MongoDB connected → ${connection.connection.host}/${connection.connection.name}`);

    mongoose.connection.on('error', (err) =>
      logger.error(`MongoDB runtime error: ${err.message}`)
    );
    mongoose.connection.on('disconnected', () =>
      logger.warn('MongoDB connection lost. Mongoose will try to reconnect.')
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to connect to MongoDB: ${message}`);
    logger.error('Check MONGODB_URI in backend/.env and make sure MongoDB is running.');
    process.exit(1);
  }
}