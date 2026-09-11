import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { createBotRoutes } from './routes/bot';
import { createStatsRoutes } from './routes/stats';
import { createAuthRoutes } from './routes/auth';
import { createCommandsRoutes } from './routes/commands';
import { createAutomationsRoutes } from './routes/automations';
import { setupWebSocket } from './websocket';

dotenv.config();

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Important pour Render
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
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

// Middleware pour vérifier l'authentification
export const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Non authentifié' });
};

// Middleware pour vérifier les droits admin
export const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.isAuthenticated() && (req.user as any)?.isAdmin) {
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

// Routes
app.use('/auth', createAuthRoutes());
app.use('/api/bot', isAuthenticated, createBotRoutes(discordClient));
app.use('/api/stats', isAuthenticated, createStatsRoutes(discordClient));
app.use('/api/commands', isAuthenticated, createCommandsRoutes(discordClient));
app.use('/api/automations', isAuthenticated, createAutomationsRoutes(discordClient));

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
