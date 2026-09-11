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
const BACKEND_URL = process.env.BACKEND_URL || 'https://bot-anbu.onrender.com';

// Cache des commandes pour éviter trop de requêtes
let customCommandsCache: any[] = [];
let lastFetch = 0;
const CACHE_TTL = 30000; // 30 secondes

// Cache des automatisations
let automationsCache: any = null;
let lastAutomationsFetch = 0;

// Cache XP pour le level system (userId -> { xp, level, lastMessage })
const userXP = new Map<string, { xp: number; level: number; lastMessage: number }>();

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

// Récupérer les automatisations depuis l'API backend
async function fetchAutomations(): Promise<any> {
  const now = Date.now();
  if (now - lastAutomationsFetch < CACHE_TTL && automationsCache && lastAutomationsFetch > 0) {
    return automationsCache;
  }

  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/internal/automations`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          automationsCache = JSON.parse(data);
          lastAutomationsFetch = Date.now();
          resolve(automationsCache);
        } catch {
          resolve(automationsCache || {});
        }
      });
    });

    req.on('error', () => resolve(automationsCache || {}));
    req.on('timeout', () => { req.destroy(); resolve(automationsCache || {}); });
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
    activities: [{ name: 'les commandes ! | Bot Communautaire' }],
    status: 'online',
  });
});

// Événement: Nouveau membre (welcome + autorole)
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const automations = await fetchAutomations();
    
    // Autorole
    if (automations.autorole?.enabled && automations.autorole.roleId) {
      try {
        const role = member.guild.roles.cache.get(automations.autorole.roleId);
        if (role) {
          await member.roles.add(role);
          console.log(`✅ Rôle automatique attribué à ${member.user.tag}`);
        }
      } catch (error) {
        console.error('❌ Erreur autorole:', error);
      }
    }

    // Message de bienvenue
    if (automations.welcome?.enabled && automations.welcome.channelId) {
      try {
        const channel = await member.guild.channels.fetch(automations.welcome.channelId);
        if (channel?.isTextBased()) {
          const message = automations.welcome.message
            .replace(/\{user\}/g, `<@${member.id}>`)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{count\}/g, member.guild.memberCount.toString());

          if (automations.welcome.embedEnabled) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
              .setTitle(automations.welcome.embedTitle)
              .setDescription(message)
              .setColor(automations.welcome.embedColor)
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            await (channel as any).send({ embeds: [embed] });
          } else {
            await (channel as any).send(message);
          }
          console.log(`✅ Message de bienvenue envoyé pour ${member.user.tag}`);
        }
      } catch (error) {
        console.error('❌ Erreur welcome:', error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur gestion nouveau membre:', error);
  }
});

// Événement: Membre parti (goodbye)
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const automations = await fetchAutomations();
    
    if (automations.goodbye?.enabled && automations.goodbye.channelId) {
      try {
        const channel = await member.guild.channels.fetch(automations.goodbye.channelId);
        if (channel?.isTextBased()) {
          const message = automations.goodbye.message
            .replace(/\{user\}/g, member.user.tag)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{count\}/g, member.guild.memberCount.toString());

          await (channel as any).send(message);
          console.log(`✅ Message de départ envoyé pour ${member.user.tag}`);
        }
      } catch (error) {
        console.error('❌ Erreur goodbye:', error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur gestion départ membre:', error);
  }
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
  // Ignorer les bots
  if (message.author.bot) return;

  try {
    const automations = await fetchAutomations();

    // ===== AUTOMOD =====
    if (automations.automod?.enabled && message.guild) {
      let shouldDelete = false;
      let reason = '';

      // Anti-spam (messages identiques rapides - détection simple)
      // Note: une vraie détection anti-spam nécessiterait un cache de messages par user

      // Anti-liens
      if (automations.automod.antiLinks) {
        const linkRegex = /(https?:\/\/[^\s]+)/gi;
        if (linkRegex.test(message.content)) {
          shouldDelete = true;
          reason = 'Lien interdit';
        }
      }

      // Anti-caps
      if (automations.automod.antiCaps && message.content.length > 10) {
        const capsCount = (message.content.match(/[A-Z]/g) || []).length;
        const capsPercent = (capsCount / message.content.length) * 100;
        if (capsPercent > (automations.automod.capsThreshold || 70)) {
          shouldDelete = true;
          reason = 'Trop de majuscules';
        }
      }

      // Supprimer le message et logger
      if (shouldDelete) {
        try {
          await message.delete();
          console.log(`🛡️ Message supprimé de ${message.author.tag}: ${reason}`);
          
          // Logger dans le canal de logs si configuré
          if (automations.automod.logChannelId) {
            const logChannel = await message.guild.channels.fetch(automations.automod.logChannelId);
            if (logChannel?.isTextBased()) {
              await (logChannel as any).send(
                `🛡️ **Automod**: Message de ${message.author.tag} supprimé\n**Raison**: ${reason}\n**Contenu**: ${message.content.slice(0, 100)}`
              );
            }
          }
        } catch (error) {
          console.error('❌ Erreur automod:', error);
        }
        return; // Ne pas traiter les commandes si le message est supprimé
      }
    }

    // ===== LEVEL SYSTEM =====
    if (automations.levelSystem?.enabled && message.guild) {
      const userId = message.author.id;
      const now = Date.now();
      const userData = userXP.get(userId) || { xp: 0, level: 1, lastMessage: 0 };
      
      // Cooldown XP
      const cooldown = (automations.levelSystem.xpCooldown || 60) * 1000;
      if (now - userData.lastMessage >= cooldown) {
        userData.xp += automations.levelSystem.xpPerMessage || 15;
        userData.lastMessage = now;

        // Calcul du niveau (100 XP par niveau par exemple)
        const newLevel = Math.floor(userData.xp / 100) + 1;
        
        if (newLevel > userData.level) {
          userData.level = newLevel;
          userXP.set(userId, userData);

          // Message de level up
          if (automations.levelSystem.channelId) {
            try {
              const levelChannel = await message.guild.channels.fetch(automations.levelSystem.channelId);
              if (levelChannel?.isTextBased()) {
                const levelMsg = automations.levelSystem.message
                  .replace(/\{user\}/g, `<@${userId}>`)
                  .replace(/\{level\}/g, newLevel.toString());
                await (levelChannel as any).send(levelMsg);
              }
            } catch (error) {
              console.error('❌ Erreur level up:', error);
            }
          }
        } else {
          userXP.set(userId, userData);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur automatisations:', error);
  }

  // ===== COMMANDES AVEC PRÉFIXE ! =====
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
