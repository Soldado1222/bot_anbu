import { Router } from 'express';
import { Client } from 'discord.js';

export function createStatsRoutes(client: Client) {
  const router = Router();

  // Statistiques générales du bot
  router.get('/', (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const stats = {
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      channels: client.channels.cache.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      ping: client.ws.ping,
      timestamp: new Date().toISOString(),
    };

    res.json(stats);
  });

  // Statistiques détaillées par serveur
  router.get('/guilds', (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const guilds = client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL(),
      ownerId: guild.ownerId,
      createdAt: guild.createdAt.toISOString(),
    }));

    res.json(guilds);
  });

  // Statistiques d'un serveur spécifique
  router.get('/guilds/:guildId', async (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    try {
      const channels = guild.channels.cache.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      }));

      const roles = guild.roles.cache.map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
      }));

      res.json({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        icon: guild.iconURL(),
        channels,
        roles,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
  });

  return router;
}
