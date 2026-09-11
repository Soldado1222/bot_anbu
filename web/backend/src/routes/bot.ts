import { Router } from 'express';
import { Client, ActivityType } from 'discord.js';
import { isAdmin } from '../server';

export function createBotRoutes(client: Client) {
  const router = Router();

  // Obtenir le statut du bot
  router.get('/status', (req, res) => {
    res.json({
      connected: client.isReady(),
      user: client.user ? {
        id: client.user.id,
        username: client.user.username,
        avatar: client.user.displayAvatarURL(),
        tag: client.user.tag,
      } : null,
      uptime: process.uptime(),
      ping: client.ws.ping,
    });
  });

  // Modifier le statut du bot (admin uniquement)
  router.post('/status', isAdmin, async (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const { activity, status } = req.body;

    try {
      await client.user!.setPresence({
        activities: activity ? [{
          name: activity.name || 'le serveur',
          type: activity.type || ActivityType.Watching,
        }] : [],
        status: status || 'online',
      });

      res.json({ 
        message: 'Statut mis à jour',
        newStatus: {
          activity: activity?.name,
          status: status,
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
    }
  });

  // Envoyer un message dans un canal (admin uniquement)
  router.post('/send-message', isAdmin, async (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const { channelId, content, embeds } = req.body;

    if (!channelId || !content) {
      return res.status(400).json({ error: 'channelId et content requis' });
    }

    try {
      const channel = await client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Canal non trouvé ou non textuel' });
      }

      // Type guard pour vérifier que le canal peut envoyer des messages
      if (!('send' in channel)) {
        return res.status(400).json({ error: 'Ce canal ne supporte pas l\'envoi de messages' });
      }

      const message = await channel.send({
        content,
        embeds: embeds || [],
      });

      res.json({
        message: 'Message envoyé',
        messageId: message.id,
        timestamp: message.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Erreur envoi message:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Obtenir la liste des canaux d'un serveur
  router.get('/guilds/:guildId/channels', async (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Serveur non trouvé' });
    }

    const channels = guild.channels.cache
      .filter(channel => channel.isTextBased())
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      }));

    res.json(channels);
  });

  // Redémarrer le bot (admin uniquement)
  router.post('/restart', isAdmin, async (req, res) => {
    res.json({ message: 'Redémarrage du bot en cours...' });
    
    setTimeout(() => {
      process.exit(0); // Le gestionnaire de processus (PM2, systemd, etc.) redémarrera le bot
    }, 1000);
  });

  return router;
}
