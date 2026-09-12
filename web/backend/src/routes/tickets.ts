import { Router } from 'express';
import { Client, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

const TICKETS_FILE = path.join(process.cwd(), 'data', 'tickets.json');

// ── Types ────────────────────────────────────────────────────────────────────

export interface TicketEntry {
  id: string;
  channelId: string;
  userId: string;
  userTag: string;
  category: string;
  subject: string;
  createdAt: string;
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
}

export interface TicketConfig {
  enabled: boolean;
  logChannelId: string;
  categoryId: string;
  supportRoleId: string;
  embedTitle: string;
  embedDescription: string;
  embedColor: string;
  embedThumbnail: string;
  maxPerUser: number;
  openTickets: number;
  closedTickets: number;
  tickets: TicketEntry[];
}

const defaultConfig: TicketConfig = {
  enabled: false,
  logChannelId: '',
  categoryId: '',
  supportRoleId: '',
  embedTitle: '🎫 Support & Tickets',
  embedDescription:
    '> Besoin d\'aide ? Ouvre un ticket et notre équipe te répondra.\n\n' +
    '**Catégories disponibles :**\n' +
    '🐛 **Bug** — Signaler un problème technique\n' +
    '💡 **Suggestion** — Proposer une idée\n' +
    '🤝 **Partenariat** — Demande de partenariat\n' +
    '❓ **Autre** — Toute autre question\n\n' +
    '*Clique sur le bouton ci-dessous pour créer ton ticket.*',
  embedColor: '#5865F2',
  embedThumbnail: '',
  maxPerUser: 1,
  openTickets: 0,
  closedTickets: 0,
  tickets: [],
};

// ── Helpers persistence ───────────────────────────────────────────────────────

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

export async function loadTickets(): Promise<TicketConfig> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(TICKETS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      ...defaultConfig,
      ...parsed,
      tickets: parsed.tickets || [],
    };
  } catch {
    return { ...defaultConfig };
  }
}

async function saveTickets(config: TicketConfig): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TICKETS_FILE, JSON.stringify(config, null, 2));
}

// ── Route factory ─────────────────────────────────────────────────────────────

export function createTicketsRoutes(client: Client) {
  const router = Router();

  // ── GET /api/tickets — config complète + liste des tickets ──────────────
  router.get('/', async (_req, res) => {
    try {
      const config = await loadTickets();
      // Enrichir les tickets avec les vraies données Discord si le bot est connecté
      if (client.isReady()) {
        config.openTickets = config.tickets.filter(t => t.status === 'open').length;
        config.closedTickets = config.tickets.filter(t => t.status === 'closed').length;
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des tickets' });
    }
  });

  // ── GET /api/tickets/stats — statistiques rapides ──────────────────────
  router.get('/stats', async (_req, res) => {
    try {
      const config = await loadTickets();
      const now = new Date();
      const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recent = config.tickets.filter(
        t => new Date(t.createdAt) >= last7days
      );

      const byCategory = config.tickets.reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {});

      // Tickets par jour (7 derniers jours)
      const byDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        byDay[key] = 0;
      }
      recent.forEach(t => {
        const key = new Date(t.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
        });
        if (key in byDay) byDay[key]++;
      });

      res.json({
        total: config.tickets.length,
        open: config.tickets.filter(t => t.status === 'open').length,
        closed: config.tickets.filter(t => t.status === 'closed').length,
        last7days: recent.length,
        byCategory,
        byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du calcul des stats' });
    }
  });

  // ── GET /api/tickets/config — configuration uniquement ─────────────────
  router.get('/config', async (_req, res) => {
    try {
      const { tickets: _t, ...configOnly } = await loadTickets();
      res.json(configOnly);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement de la config' });
    }
  });

  // ── PATCH /api/tickets/config — mise à jour partielle de la config ──────
  router.patch('/config', async (req, res) => {
    try {
      const current = await loadTickets();
      // Ne pas écraser le tableau de tickets via cette route
      const { tickets: _t, openTickets: _o, closedTickets: _c, ...safeFields } = req.body;
      const updated: TicketConfig = { ...current, ...safeFields };
      await saveTickets(updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
  });

  // ── GET /api/tickets/list — liste paginée des tickets ──────────────────
  router.get('/list', async (req, res) => {
    try {
      const config = await loadTickets();
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const category = req.query.category as string | undefined;

      let filtered = [...config.tickets].reverse(); // Plus récents en premier

      if (status && status !== 'all') {
        filtered = filtered.filter(t => t.status === status);
      }
      if (category && category !== 'all') {
        filtered = filtered.filter(t => t.category === category);
      }

      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      res.json({
        tickets: paginated,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
    }
  });

  // ── DELETE /api/tickets/:ticketId — supprimer un ticket de l'historique ─
  router.delete('/:ticketId', async (req, res) => {
    try {
      const config = await loadTickets();
      const before = config.tickets.length;
      config.tickets = config.tickets.filter(t => t.id !== req.params.ticketId);

      if (config.tickets.length === before) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
      }

      config.openTickets = config.tickets.filter(t => t.status === 'open').length;
      config.closedTickets = config.tickets.filter(t => t.status === 'closed').length;
      await saveTickets(config);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // ── POST /api/tickets/deploy — déployer le panneau via le dashboard ─────
  router.post('/deploy', async (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    const { channelId } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId requis' });
    }

    try {
      const config = await loadTickets();
      const channel = await client.channels.fetch(channelId) as TextChannel;

      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Canal introuvable ou non textuel' });
      }

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

      const panelEmbed = new EmbedBuilder()
        .setColor(config.embedColor as any || Colors.Blurple)
        .setTitle(config.embedTitle || '🎫 Support & Tickets')
        .setDescription(config.embedDescription)
        .setFooter({
          text: channel.guild.name,
          iconURL: channel.guild.iconURL() || undefined,
        })
        .setTimestamp();

      if (config.embedThumbnail) {
        panelEmbed.setThumbnail(config.embedThumbnail);
      }

      const row = new ActionRowBuilder<any>().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:open')
          .setLabel('📩 Ouvrir un ticket')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket:my_tickets')
          .setLabel('📋 Mes tickets')
          .setStyle(ButtonStyle.Secondary)
      );

      await (channel as any).send({ embeds: [panelEmbed], components: [row] });

      res.json({ success: true, message: `Panneau déployé dans #${channel.name}` });
    } catch (error: any) {
      console.error('Erreur deploy tickets:', error);
      res.status(500).json({ error: error.message || 'Erreur lors du déploiement' });
    }
  });

  // ── POST /api/tickets/close/:ticketId — fermer un ticket depuis le dashboard
  router.post('/close/:ticketId', async (req, res) => {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot non connecté' });
    }

    try {
      const config = await loadTickets();
      const ticket = config.tickets.find(t => t.id === req.params.ticketId);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
      }

      if (ticket.status === 'closed') {
        return res.status(400).json({ error: 'Ticket déjà fermé' });
      }

      const reason = req.body.reason || 'Fermé depuis le dashboard';
      const guild = client.guilds.cache.first();

      if (guild) {
        const channel = guild.channels.cache.get(ticket.channelId) as any;
        if (channel) {
          // Notifier dans le canal
          const closeEmbed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle('🔒 Ticket fermé depuis le dashboard')
            .setDescription(`📋 **Raison :** ${reason}`)
            .setTimestamp();

          await channel.send({ embeds: [closeEmbed] }).catch(() => {});

          // Envoyer DM au créateur
          try {
            const creator = await guild.members.fetch(ticket.userId).catch(() => null);
            if (creator) {
              const dmEmbed = new EmbedBuilder()
                .setColor(Colors.Orange)
                .setTitle('🔒 Ton ticket a été fermé')
                .setDescription(
                  `Ton ticket **${channel.name}** sur **${guild.name}** a été fermé par un administrateur.\n\n` +
                  `📋 **Raison :** ${reason}`
                )
                .setTimestamp();
              await creator.send({ embeds: [dmEmbed] }).catch(() => {});
            }
          } catch {}

          // Supprimer le canal après 3s
          setTimeout(() => channel.delete().catch(() => {}), 3000);
        }
      }

      // Mettre à jour le ticket
      ticket.status = 'closed';
      ticket.closedAt = new Date().toISOString();
      ticket.closedBy = 'Dashboard';
      ticket.closeReason = reason;
      config.openTickets = config.tickets.filter(t => t.status === 'open').length;
      config.closedTickets = config.tickets.filter(t => t.status === 'closed').length;
      await saveTickets(config);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erreur lors de la fermeture' });
    }
  });

  // ── GET /api/tickets/guild/channels — canaux textuels du serveur ────────
  router.get('/guild/channels', async (_req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    const guild = client.guilds.cache.first();
    if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

    const channels = guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: (c as any).name }));

    res.json(channels);
  });

  // ── GET /api/tickets/guild/categories — catégories Discord du serveur ───
  router.get('/guild/categories', async (_req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    const guild = client.guilds.cache.first();
    if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

    const { ChannelType } = await import('discord.js');
    const categories = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildCategory)
      .map(c => ({ id: c.id, name: (c as any).name }));

    res.json(categories);
  });

  // ── GET /api/tickets/guild/roles — rôles du serveur ────────────────────
  router.get('/guild/roles', async (_req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    const guild = client.guilds.cache.first();
    if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

    const roles = guild.roles.cache
      .filter(r => !r.managed && r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    res.json(roles);
  });

  return router;
}

export { loadTickets as loadTicketsConfig };
