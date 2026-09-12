import { Router } from 'express';
import { Client } from 'discord.js';

export function createModerationRoutes(client: Client) {
  const router = Router();

  // Récupérer tous les membres d'un serveur
  router.get('/guild/:guildId/members', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      // Fetch membres + rôles ensemble pour s'assurer que le cache est complet
      await guild.members.fetch();
      await guild.roles.fetch();

      const members = guild.members.cache.map(member => ({
        id: member.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        displayName: member.displayName,
        avatar: member.user.displayAvatarURL({ size: 64 }),
        bot: member.user.bot,
        joinedAt: member.joinedAt?.toISOString() ?? null,
        roles: member.roles.cache
          .filter(r => r.id !== guild.id) // exclure @everyone
          .sort((a, b) => b.position - a.position)
          .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
        permissions: {
          administrator: member.permissions.has('Administrator'),
          moderator: member.permissions.has('KickMembers') || member.permissions.has('BanMembers'),
        },
      }));

      res.json(members);
    } catch (error: any) {
      console.error('Erreur récupération membres:', error);
      res.status(500).json({ error: error.message || 'Erreur récupération membres' });
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

      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      if (member.permissions.has('Administrator')) {
        return res.status(403).json({ error: 'Impossible de kick un administrateur' });
      }

      await member.kick(reason || 'Aucune raison fournie');
      res.json({ message: `${member.user.username} a été expulsé` });
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

      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      if (member.permissions.has('Administrator')) {
        return res.status(403).json({ error: 'Impossible de bannir un administrateur' });
      }

      await guild.members.ban(memberId, {
        reason: reason || 'Aucune raison fournie',
        deleteMessageSeconds: deleteMessages ? 86400 : 0,
      });

      res.json({ message: `${member.user.username} a été banni` });
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
      const { duration, reason } = req.body;

      if (!duration || isNaN(duration) || duration <= 0) {
        return res.status(400).json({ error: 'Durée invalide' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      if (member.permissions.has('Administrator')) {
        return res.status(403).json({ error: 'Impossible de timeout un administrateur' });
      }

      await member.timeout(Number(duration) * 60 * 1000, reason || 'Aucune raison fournie');
      res.json({ message: `${member.user.username} a été timeout pour ${duration} minutes` });
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
      const { roleId, action } = req.body;

      if (!roleId || !action) {
        return res.status(400).json({ error: 'roleId et action requis' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      // Fetch rôles ET membre depuis l'API pour être sûr
      const [member, role] = await Promise.all([
        guild.members.fetch(memberId).catch(() => null),
        guild.roles.fetch(roleId).catch(() => null),
      ]);

      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });
      if (!role) return res.status(404).json({ error: 'Rôle non trouvé' });

      // Vérifier que le rôle du bot est au-dessus du rôle cible
      const botMember = guild.members.me;
      if (botMember && role.position >= botMember.roles.highest.position) {
        return res.status(403).json({ error: 'Le rôle est trop élevé pour que le bot puisse le gérer' });
      }

      if (action === 'add') {
        await member.roles.add(role);
        res.json({ message: `Rôle ${role.name} ajouté à ${member.user.username}` });
      } else if (action === 'remove') {
        await member.roles.remove(role);
        res.json({ message: `Rôle ${role.name} retiré de ${member.user.username}` });
      } else {
        res.status(400).json({ error: 'Action invalide (add ou remove)' });
      }
    } catch (error: any) {
      console.error('Erreur rôle:', error);
      res.status(500).json({ error: error.message || 'Erreur modification rôle' });
    }
  });

  // Envoyer un DM
  router.post('/guild/:guildId/member/:memberId/dm', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId, memberId } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message vide' });
      }

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

      await member.send(message);
      res.json({ message: `Message privé envoyé à ${member.user.username}` });
    } catch (error: any) {
      console.error('Erreur DM:', error);
      // Discord renvoie 50007 si l'utilisateur bloque les DMs
      if (error.code === 50007) {
        return res.status(403).json({ error: 'Ce membre a désactivé les messages privés' });
      }
      res.status(500).json({ error: error.message || 'Erreur envoi DM' });
    }
  });

  // Récupérer les rôles d'un serveur (pour la liste dans le frontend)
  router.get('/guild/:guildId/roles', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

      const roles = await guild.roles.fetch();
      const list = roles
        .filter(r => !r.managed && r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

      res.json(list);
    } catch (error: any) {
      console.error('Erreur rôles:', error);
      res.status(500).json({ error: error.message || 'Erreur récupération rôles' });
    }
  });

  return router;
}
