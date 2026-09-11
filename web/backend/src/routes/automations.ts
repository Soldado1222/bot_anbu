import { Router } from 'express';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

const AUTOMATIONS_FILE = path.join(process.cwd(), 'data', 'automations.json');

interface AutomationConfig {
  welcome: {
    enabled: boolean;
    channelId: string;
    message: string;
    embedEnabled: boolean;
    embedColor: string;
    embedTitle: string;
  };
  goodbye: {
    enabled: boolean;
    channelId: string;
    message: string;
  };
  autorole: {
    enabled: boolean;
    roleId: string;
  };
  automod: {
    enabled: boolean;
    antiSpam: boolean;
    antiLinks: boolean;
    antiCaps: boolean;
    capsThreshold: number;
    logChannelId: string;
  };
  levelSystem: {
    enabled: boolean;
    channelId: string;
    message: string;
    xpPerMessage: number;
    xpCooldown: number;
  };
}

const defaultConfig: AutomationConfig = {
  welcome: {
    enabled: false,
    channelId: '',
    message: 'Bienvenue {user} sur {server} ! Tu es le {count}ème membre.',
    embedEnabled: false,
    embedColor: '#5865F2',
    embedTitle: 'Bienvenue !',
  },
  goodbye: {
    enabled: false,
    channelId: '',
    message: '{user} a quitté le serveur. Nous sommes maintenant {count} membres.',
  },
  autorole: {
    enabled: false,
    roleId: '',
  },
  automod: {
    enabled: false,
    antiSpam: false,
    antiLinks: false,
    antiCaps: false,
    capsThreshold: 70,
    logChannelId: '',
  },
  levelSystem: {
    enabled: false,
    channelId: '',
    message: 'Félicitations {user}, tu as atteint le niveau {level} !',
    xpPerMessage: 15,
    xpCooldown: 60,
  },
};

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try { await fs.access(dataDir); } catch { await fs.mkdir(dataDir, { recursive: true }); }
}

async function loadAutomations(): Promise<AutomationConfig> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(AUTOMATIONS_FILE, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(data) };
  } catch {
    return defaultConfig;
  }
}

async function saveAutomations(config: AutomationConfig) {
  await ensureDataDir();
  await fs.writeFile(AUTOMATIONS_FILE, JSON.stringify(config, null, 2));
}

export function createAutomationsRoutes(client: Client) {
  const router = Router();

  // Récupérer la config
  router.get('/', async (req, res) => {
    try {
      const config = await loadAutomations();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement' });
    }
  });

  // Mettre à jour la config
  router.put('/', async (req, res) => {
    try {
      const current = await loadAutomations();
      const updated = { ...current, ...req.body };
      await saveAutomations(updated);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
  });

  // Mettre à jour une section spécifique
  router.patch('/:section', async (req, res) => {
    try {
      const { section } = req.params;
      const config = await loadAutomations();

      if (!(section in config)) {
        return res.status(404).json({ error: 'Section non trouvée' });
      }

      (config as any)[section] = { ...(config as any)[section], ...req.body };
      await saveAutomations(config);
      res.json((config as any)[section]);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  });

  // Tester le message de bienvenue
  router.post('/welcome/test', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    const config = await loadAutomations();
    if (!config.welcome.channelId) return res.status(400).json({ error: 'Canal non configuré' });

    try {
      const channel = await client.channels.fetch(config.welcome.channelId) as TextChannel;
      if (!channel) return res.status(404).json({ error: 'Canal introuvable' });

      const testMessage = config.welcome.message
        .replace('{user}', '<@test_user>')
        .replace('{server}', channel.guild?.name || 'Serveur')
        .replace('{count}', '42');

      if (config.welcome.embedEnabled) {
        const embed = new EmbedBuilder()
          .setTitle(config.welcome.embedTitle)
          .setDescription(testMessage)
          .setColor(config.welcome.embedColor as any)
          .setTimestamp();
        await channel.send({ embeds: [embed] });
      } else {
        await channel.send(testMessage);
      }

      res.json({ message: 'Message de test envoyé !' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'envoi du test' });
    }
  });

  // Récupérer les rôles d'un serveur
  router.get('/guild/roles', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    const guild = client.guilds.cache.first();
    if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

    const roles = guild.roles.cache
      .filter(r => !r.managed && r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    res.json(roles);
  });

  // Récupérer les canaux d'un serveur
  router.get('/guild/channels', async (req, res) => {
    if (!client.isReady()) return res.status(503).json({ error: 'Bot non connecté' });

    const guild = client.guilds.cache.first();
    if (!guild) return res.status(404).json({ error: 'Serveur non trouvé' });

    const channels = guild.channels.cache
      .filter(c => c.isTextBased())
      .map(c => ({ id: c.id, name: c.name }));

    res.json(channels);
  });

  return router;
}

export { loadAutomations };
