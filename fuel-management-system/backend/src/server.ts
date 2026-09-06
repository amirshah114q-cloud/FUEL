import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function start(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Fuel Management API listening on port ${env.PORT} (mode: ${env.NODE_ENV})`);
    logger.info(`Health check → http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
      });
    });
    setTimeout(() => {
      logger.error('Forced shutdown after waiting 10s for open connections.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${String(reason)}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`, { stack: err.stack });
    shutdown('uncaughtException');
  });
}

start();