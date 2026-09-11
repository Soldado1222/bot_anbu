import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { config, isDeveloper } from './config';
import { Command } from './types';
import { loadCommands } from './handlers/commandHandler';

// Extension du type Client pour inclure la collection de commandes
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

// Création du client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
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
