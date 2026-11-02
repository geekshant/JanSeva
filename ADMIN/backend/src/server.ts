import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { createRealtimeServer } from './modules/realtime';
import { prisma } from './db/prisma';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = http.createServer(app);
  createRealtimeServer(httpServer);

  // Fail fast if the database is unreachable.
  await prisma.$queryRaw`SELECT 1`;

  httpServer.listen(env.port, env.host, () => {
    logger.info(`JanMitra backend listening on http://${env.host}:${env.port}${env.apiBasePath}`);
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Failed to bootstrap JanMitra backend');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('SIGTERM', () => {
  void prisma.$disconnect();
  process.exit(0);
});