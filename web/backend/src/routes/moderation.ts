import { Router } from 'express';
import { Client, GuildMember } from 'discord.js';

export function createModerationRoutes(client: Client) {
  const router = Router();

  // Récupérer tous les membres d'un serveur
  router.get('/guild/:guildId/members', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      // Fetch tous les membres (important car cache peut être incomplet)
      await guild.members.fetch();

      const members = guild.members.cache.map(member => ({
        id: member.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        displayName: member.displayName,
        avatar: member.user.displayAvatarURL(),
        bot: member.user.bot,
        joinedAt: member.joinedAt?.toISOString(),
        roles: member.roles.cache
          .filter(r => r.id !== guild.id)
          .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
        permissions: {
          administrator: member.permissions.has('Administrator'),
          moderator: member.permissions.has('KickMembers') || member.permissions.has('BanMembers'),
        },
      }));

      res.json(members);
    } catch (error) {
      console.error('Erreur récupération membres:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
    }
  });

  // Kick un membre
  router.post('/guild/:guildId/member/:memberId/kick', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId, memberId } = req.params;
      const { reason } = req.body;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      await member.kick(reason || 'Aucune raison fournie');
      res.json({ message: `${member.user.tag} a été expulsé` });
    } catch (error: any) {
      console.error('Erreur kick:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de l\'expulsion' });
    }
  });

  // Ban un membre
  router.post('/guild/:guildId/member/:memberId/ban', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId, memberId } = req.params;
      const { reason, deleteMessages } = req.body;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      await member.ban({ 
        reason: reason || 'Aucune raison fournie',
        deleteMessageSeconds: deleteMessages ? 86400 : 0 // 1 jour ou 0
      });
      
      res.json({ message: `${member.user.tag} a été banni` });
    } catch (error: any) {
      console.error('Erreur ban:', error);
      res.status(500).json({ error: error.message || 'Erreur lors du bannissement' });
    }
  });

  // Timeout un membre
  router.post('/guild/:guildId/member/:memberId/timeout', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId, memberId } = req.params;
      const { duration, reason } = req.body; // duration en minutes

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      await member.timeout(duration * 60 * 1000, reason || 'Aucune raison fournie');
      res.json({ message: `${member.user.tag} a été timeout pour ${duration} minutes` });
    } catch (error: any) {
      console.error('Erreur timeout:', error);
      res.status(500).json({ error: error.message || 'Erreur lors du timeout' });
    }
  });

  // Ajouter/retirer un rôle
  router.post('/guild/:guildId/member/:memberId/role', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId, memberId } = req.params;
      const { roleId, action } = req.body; // action: 'add' ou 'remove'

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      const role = guild.roles.cache.get(roleId);
      if (!role) return res.status(404).json({ error: 'Rôle non trouvé' });

      if (action === 'add') {
        await member.roles.add(role);
        res.json({ message: `Rôle ${role.name} ajouté à ${member.user.tag}` });
      } else {
        await member.roles.remove(role);
        res.json({ message: `Rôle ${role.name} retiré de ${member.user.tag}` });
      }
    } catch (error: any) {
      console.error('Erreur rôle:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de la modification du rôle' });
    }
  });

  // Envoyer un DM
  router.post('/guild/:guildId/member/:memberId/dm', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId, memberId } = req.params;
      const { message } = req.body;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      await member.send(message);
      res.json({ message: `Message privé envoyé à ${member.user.tag}` });
    } catch (error: any) {
      console.error('Erreur DM:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de l\'envoi du message' });
    }
  });

  return router;
}
