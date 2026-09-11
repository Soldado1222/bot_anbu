import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { config, isDeveloper } from './config';
import { Command } from './types';
import { loadCommands } from './handlers/commandHandler';
import https from 'https';
import http from 'http';

// Extension du type Client pour inclure la collection de commandes
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

const PREFIX = '!';

// URL de l'API backend (même service sur Render, ou localhost en dev)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Cache des commandes pour éviter trop de requêtes
let customCommandsCache: any[] = [];
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 secondes

// Récupérer les commandes custom depuis l'API backend
async function fetchCustomCommands(): Promise<any[]> {
  const now = Date.now();
  if (now - lastFetch < CACHE_TTL && customCommandsCache.length >= 0 && lastFetch > 0) {
    return customCommandsCache;
  }

  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/internal/commands`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          customCommandsCache = JSON.parse(data);
          lastFetch = Date.now();
          resolve(customCommandsCache);
        } catch {
          resolve(customCommandsCache);
        }
      });
    });

    req.on('error', () => resolve(customCommandsCache));
    req.on('timeout', () => { req.destroy(); resolve(customCommandsCache); });
  });
}

// Remplacer les variables dans la réponse
function parseResponse(response: string, context: { user: string, server: string, channel: string }): string {
  return response
    .replace(/\{user\}/g, context.user)
    .replace(/\{server\}/g, context.server)
    .replace(/\{channel\}/g, context.channel);
}

// Création du client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialisation de la collection de commandes
client.commands = new Collection();

// Événement: Bot prêt
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
  console.log(`📊 Serveurs: ${c.guilds.cache.size}`);
  console.log(`👥 Utilisateurs: ${c.users.cache.size}`);
  console.log(`🔧 ${config.devIds.length} développeur(s) autorisé(s)`);
  
  // Définir le statut du bot
  c.user.setPresence({
    activities: [{ name: 'les commandes / | Bot Communautaire' }],
    status: 'online',
  });
});

// Événement: Interaction créée (commandes slash)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ Commande inconnue: ${interaction.commandName}`);
    return;
  }

  // Vérification des permissions développeur
  if (command.devOnly && !isDeveloper(interaction.user.id)) {
    await interaction.reply({
      content: '❌ Cette commande est réservée aux développeurs du bot.',
      ephemeral: true,
    });
    return;
  }

  try {
    console.log(
      `📝 ${interaction.user.tag} a exécuté /${interaction.commandName} dans ${interaction.guild?.name || 'DM'}`
    );
    await command.execute(interaction);
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la commande:', error);
    
    const errorMessage = {
      content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Événement: Message créé (commandes avec préfixe !)
client.on(Events.MessageCreate, async (message) => {
  // Ignorer les bots et les messages sans préfixe
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  // Parser le nom de la commande et les arguments
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // Charger les commandes personnalisées
  const customCommands = await fetchCustomCommands();
  const customCommand = customCommands.find(
    (cmd) => cmd.name.toLowerCase() === commandName && cmd.enabled
  );

  if (customCommand) {
    try {
      const response = parseResponse(customCommand.response, {
        user: `<@${message.author.id}>`,
        server: message.guild?.name || 'Serveur',
        channel: `<#${message.channel.id}>`,
      });

      await message.reply(response);
      console.log(`📝 ${message.author.tag} a exécuté !${commandName} dans ${message.guild?.name}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution de !${commandName}:`, error);
      await message.reply('❌ Une erreur s\'est produite lors de l\'exécution de cette commande.');
    }
    return;
  }

  // Commande non trouvée
  // On ne répond rien pour éviter le spam si quelqu'un utilise ! pour autre chose
});

// Événement: Erreur
client.on(Events.Error, (error) => {
  console.error('❌ Erreur Discord.js:', error);
});

// Événement: Avertissement
client.on(Events.Warn, (warning) => {
  console.warn('⚠️ Avertissement Discord.js:', warning);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Promesse non gérée:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Chargement des commandes et connexion du bot
async function main() {
  try {
    console.log('🔄 Chargement des commandes...');
    await loadCommands(client);
    console.log(`✅ ${client.commands.size} commande(s) chargée(s)`);

    console.log('🔄 Connexion au bot Discord...');
    await client.login(config.token);
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du bot:', error);
    process.exit(1);
  }
}

main();
