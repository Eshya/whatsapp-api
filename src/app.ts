import compression from 'compression';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import flash from 'express-flash';
import path from 'path';
// import { databaseConnect } from "./config/database";
import { WhatsappService } from './services/whatsapp-service';
import { SESSION_SECRET, DB_CONNECTION_STRING, HOST, PORT } from './util/environment';

// Controllers (route handlers)
import * as homeController from './controllers/home';
import * as messageController from './controllers/message';
import * as messagesController from './controllers/messages';
import * as realtimeController from './controllers/realtime';
import * as qrController from './controllers/qr';
import * as statusController from './controllers/status';
import * as logoutController from './controllers/logout';

// Connect Database
// databaseConnect(DB_CONNECTION_STRING);

// Create Express Server
const app = express();

// Services
const wa = new WhatsappService();
wa.Initialize();
const exposeWhatsappService = (req: Request, res: Response, next: NextFunction) => {
  req.wa = wa;
  next();
}

// Express configuration
app.set('port', PORT);
app.set('host', HOST);
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: SESSION_SECRET as string
}));
app.use(flash());

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/message', messageController.getMessageForm);
app.post('/message', exposeWhatsappService, messageController.postMessage);

// Message management routes
app.get('/messages', exposeWhatsappService, messagesController.getMessages);
app.delete('/messages', exposeWhatsappService, messagesController.clearMessages);
app.get('/messages/stream', exposeWhatsappService, messagesController.streamMessages);
app.get('/messages/paginated', exposeWhatsappService, messagesController.getPaginatedMessages);

// Real-time chat routes
app.get('/realtime', exposeWhatsappService, realtimeController.getRealtimePage);
app.get('/api/realtime/status', exposeWhatsappService, realtimeController.getRealtimeStatus);

app.get('/qr', exposeWhatsappService, qrController.getQrCode);
app.get('/status', exposeWhatsappService, statusController.getStatus);
app.post('/logout', exposeWhatsappService, logoutController.postLogout);

export default app;