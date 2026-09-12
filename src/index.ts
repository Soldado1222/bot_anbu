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

// URL de l'API backend (même service sur Render, ou localhost en dev)
const BACKEND_URL = process.env.BACKEND_URL || 'https://bot-anbu.onrender.com';

// Cache des automatisations
let automationsCache: any = null;
let lastAutomationsFetch = 0;
const CACHE_TTL = 30000; // 30 secondes

// Cache XP pour le level system (userId -> { xp, level, lastMessage })
const userXP = new Map<string, { xp: number; level: number; lastMessage: number }>();

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
          console.log('✅ Automatisations récupérées depuis le backend');
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
    activities: [{ name: 'les commandes slash / | Bot Communautaire' }],
    status: 'online',
  });
  
  // Précharger les automatisations au démarrage
  fetchAutomations().then(() => {
    console.log('🔄 Automatisations chargées');
  }).catch(() => {
    console.error('⚠️ Impossible de charger les automatisations au démarrage');
  });
});

// Événement: Nouveau membre (welcome + autorole)
client.on(Events.GuildMemberAdd, async (member) => {
  // Forcer rechargement des automatisations (ignorer le cache)
  lastAutomationsFetch = 0;
  
  try {
    const automations = await fetchAutomations();
    console.log(`👤 Nouveau membre: ${member.user.tag} - Automatisations:`, JSON.stringify({
      welcome: automations.welcome?.enabled,
      autorole: automations.autorole?.enabled,
    }));

    // Autorole
    if (automations.autorole?.enabled && automations.autorole.roleId) {
      try {
        // Fetch les rôles si pas en cache
        await member.guild.roles.fetch();
        const role = member.guild.roles.cache.get(automations.autorole.roleId);
        if (role) {
          await member.roles.add(role);
          console.log(`✅ Rôle automatique "${role.name}" attribué à ${member.user.tag}`);
        } else {
          console.error(`❌ Rôle introuvable: ${automations.autorole.roleId}`);
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
              .setTitle(automations.welcome.embedTitle || 'Bienvenue !')
              .setDescription(message)
              .setColor((automations.welcome.embedColor || '#5865F2') as any)
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
  // Forcer rechargement
  lastAutomationsFetch = 0;

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

// Événement: Message créé (automod + level system)
client.on(Events.MessageCreate, async (message) => {
  // Ignorer les bots
  if (message.author.bot) return;

  try {
    const automations = await fetchAutomations();

    // ===== AUTOMOD =====
    if (automations.automod?.enabled && message.guild) {
      let shouldDelete = false;
      let reason = '';

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
        return;
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
