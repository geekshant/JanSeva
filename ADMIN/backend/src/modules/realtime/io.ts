import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyToken, AccessTokenClaims } from '../auth/jwt';
import { getCookie } from '../auth/cookies';
import { TOKEN_COOKIE_NAME } from '../../constants';
import { ADMIN_ROLES } from '../../constants/sla';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../db/prisma';

export type AppSocketServer = SocketServer;

/**
 * Attach Socket.IO to the HTTP server. Clients authenticate by passing the
 * access token as `auth.token` (API clients) or via the httpOnly cookie set
 * by the login/refresh endpoints (browser sessions). The principal is
 * available on socket.data.user.
 */
export function createRealtimeServer(httpServer: HttpServer): SocketServer {
  const server = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  server.use(async (socket, next) => {
    try {
      // Priority 1: auth.token (explicit, for programmatic clients)
      let token = socket.handshake.auth?.token as string | undefined;
      // Priority 2: httpOnly cookie (browser sessions with withCredentials)
      if (!token && socket.handshake.headers.cookie) {
        token = getCookie(
          { headers: { cookie: socket.handshake.headers.cookie } } as never,
          TOKEN_COOKIE_NAME,
        );
      }
      if (!token) {
        next(ApiError.unauthorized('Socket token required'));
        return;
      }
      const claims = verifyToken<AccessTokenClaims>(token);
      const user = await prisma.user.findUnique({ where: { id: claims.sub } });
      if (!user || !user.isActive) {
        next(ApiError.unauthorized('Socket user disabled'));
        return;
      }
      socket.data.user = { userId: claims.sub, role: user.role, departmentId: user.departmentId };
      socket.join(`user:${claims.sub}`);
      if (user.departmentId) socket.join(`dept:${user.departmentId}`);
      // `toAdmins()` emits to the `admin` room. Both admin roles need it —
      // previously only SYSTEM_ADMIN joined, so DEPARTMENT_ADMIN dashboards
      // never saw complaint/status events.
      if ((ADMIN_ROLES as readonly string[]).includes(user.role)) socket.join('admin');
      next();
    } catch {
      next(ApiError.unauthorized());
    }
  });

  server.on('connection', (socket) => {
    socket.emit('connected', { clientId: socket.id });
  });

  return server;
}