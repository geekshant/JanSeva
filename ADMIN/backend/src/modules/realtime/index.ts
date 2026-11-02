import { Server as HttpServer } from 'http';
import { createRealtimeServer as attachServer, AppSocketServer } from './io';
import { RealtimeBroadcaster } from './events';

export * from './events';

let socketServer: AppSocketServer | null = null;

/** Attach Socket.IO to the HTTP server and remember it for broadcasters. */
export function createRealtimeServer(httpServer: HttpServer): AppSocketServer {
  const server = attachServer(httpServer);
  socketServer = server;
  return server;
}

export function getSocketServer(): AppSocketServer | null {
  return socketServer;
}

/** Shared broadcaster so services are decoupled from the transport. */
export function getBroadcaster(): RealtimeBroadcaster {
  return new RealtimeBroadcaster(socketServer);
}