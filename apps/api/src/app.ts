import Fastify, { FastifyInstance } from 'fastify';
import { AppConfig } from './config.js';
import { BookingService } from './booking-service.js';
import { AuthProvider, DevelopmentAuthProvider } from './auth.js';
import { TelehealthService } from './telehealth-service.js';
import { NotificationService } from './notification-service.js';
import { registerSecurityHeaders } from './plugins/security.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerCatalogRoutes } from './routes/catalog.routes.js';
import { registerBookingRoutes } from './routes/booking.routes.js';
import { registerStaffRoutes } from './routes/staff.routes.js';
import { registerTelehealthRoutes } from './routes/telehealth.routes.js';

export function buildApp(
  config: Pick<AppConfig, 'LOG_LEVEL'>,
  bookingService: BookingService,
  authProvider: AuthProvider = new DevelopmentAuthProvider(),
  telehealthService?: TelehealthService,
  notificationService?: NotificationService
): FastifyInstance {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const sql = (bookingService as any)?.sql;
  const telehealth = telehealthService ?? (sql ? new TelehealthService(sql) : undefined);
  const notifications = notificationService ?? (sql ? new NotificationService(sql) : undefined);

  // Security & Error Plugins
  void registerSecurityHeaders(app);
  registerErrorHandler(app);

  // Route Modules
  void registerHealthRoutes(app);
  void registerAuthRoutes(app, { sql, authProvider });
  void registerCatalogRoutes(app, { bookingService });
  void registerBookingRoutes(app, { bookingService, authProvider, notifications });
  void registerStaffRoutes(app, { bookingService, authProvider });
  void registerTelehealthRoutes(app, { telehealth, authProvider });

  return app;
}
