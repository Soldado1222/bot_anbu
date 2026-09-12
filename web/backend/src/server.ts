import express from 'express';
import cors from 'cors';
import session from 'express-session';
import FileStore from 'session-file-store';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { createBotRoutes } from './routes/bot';
import { createStatsRoutes } from './routes/stats';
import { createAuthRoutes } from './routes/auth';
import { createCommandsRoutes } from './routes/commands';
import { createAutomationsRoutes } from './routes/automations';
import { createModerationRoutes } from './routes/moderation';
import { createTwitchRoutes } from './routes/twitch';
import { createTicketsRoutes, loadTicketsConfig } from './routes/tickets';
import { setupWebSocket } from './websocket';

dotenv.config();

// Créer les dossiers data/ nécessaires au démarrage (Render filesystem éphémère)
import fs from 'fs';
import path from 'path';
const dataDir = path.join(process.cwd(), 'data', 'sessions');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('📁 Dossier data/sessions créé');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration Discord Client (connexion au bot)
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://botanbu.netlify.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Session persistante sur fichier (survit aux redémarrages)
const SessionFileStore = FileStore(session);
app.use(session({
  store: new SessionFileStore({
    path: './data/sessions',
    ttl: 7 * 24 * 3600, // 7 jours
    retries: 1,
  }),
  secret: process.env.SESSION_SECRET || 'lanbu-secret-key-prod',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// Configuration Passport Discord OAuth2
passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  callbackURL: process.env.DISCORD_CALLBACK_URL!,
  scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  // Vérifier si l'utilisateur est admin
  const adminIds = process.env.ADMIN_IDS?.split(',') || [];
  const isAdmin = adminIds.includes(profile.id);
  
  return done(null, { ...profile, isAdmin, accessToken });
}));

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());

// Middleware pour vérifier l'authentification (JWT)
export const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'lanbu-jwt-secret-change-me';
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).jwtUser = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

// Middleware pour vérifier les droits admin
export const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).jwtUser;
  if (user?.isAdmin) {
    return next();
  }
  res.status(403).json({ error: 'Accès refusé - Droits administrateur requis' });
};

// Route interne pour le bot (sans auth)
app.get('/internal/commands', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'custom-commands.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.json([]);
  }
});

// Route interne pour les automatisations (sans auth)
app.get('/internal/automations', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'automations.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.json({});
  }
});

// Route interne pour la config tickets (sans auth — utilisée par le bot)
app.get('/internal/tickets', async (req, res) => {
  try {
    const config = await loadTicketsConfig();
    res.json(config);
  } catch {
    res.json({});
  }
});

// Route interne PUT pour sauvegarder la config tickets (sans auth — utilisée par le bot)
app.put('/internal/tickets', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'lanbu-internal';
  if (secret !== INTERNAL_SECRET) {
    return res.status(403).json({ error: 'Secret invalide' });
  }
  try {
    const fsModule = await import('fs/promises');
    const pathModule = await import('path');
    const filePath = pathModule.join(process.cwd(), 'data', 'tickets.json');
    const dataDir = pathModule.join(process.cwd(), 'data');
    try { await fsModule.access(dataDir); } catch { await fsModule.mkdir(dataDir, { recursive: true }); }
    await fsModule.writeFile(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des tickets' });
  }
});

// Routes
app.use('/auth', createAuthRoutes());
app.use('/api/bot', isAuthenticated, createBotRoutes(discordClient));
app.use('/api/stats', isAuthenticated, createStatsRoutes(discordClient));
app.use('/api/commands', isAuthenticated, createCommandsRoutes(discordClient));
app.use('/api/automations', isAuthenticated, createAutomationsRoutes(discordClient));
app.use('/api/moderation', isAuthenticated, createModerationRoutes(discordClient));
app.use('/api/twitch', isAuthenticated, createTwitchRoutes());
app.use('/api/tickets', isAuthenticated, createTicketsRoutes(discordClient));

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    botConnected: discordClient.isReady(),
    timestamp: new Date().toISOString(),
  });
});

// Route de debug pour voir les serveurs
app.get('/debug/guilds', (req, res) => {
  if (!discordClient.isReady()) {
    return res.status(503).json({ error: 'Bot non connecté' });
  }

  const guilds = discordClient.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
  }));

  res.json({
    botReady: discordClient.isReady(),
    guildCount: discordClient.guilds.cache.size,
    guilds: guilds,
  });
});

// Démarrage du serveur
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur API démarré sur le port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
});

// Configuration WebSocket
setupWebSocket(server, discordClient);

// Connexion du bot Discord
discordClient.once('ready', (client) => {
  console.log(`✅ Bot connecté: ${client.user.tag}`);
});

discordClient.on('error', (error) => {
  console.error('❌ Erreur Discord:', error);
});

discordClient.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('❌ Échec de connexion du bot:', error);
  process.exit(1);
});

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    discordClient.destroy();
    process.exit(0);
  });
});
