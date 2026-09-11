import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import { Command } from './types';

const commands: any[] = [];

/**
 * Charge toutes les commandes depuis le dossier commands
 */
function loadCommandsData(): void {
  const commandsPath = join(__dirname, 'commands');
  
  try {
    const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);
      
      // Vérifier si c'est un dossier
      const stat = require('fs').statSync(folderPath);
      if (!stat.isDirectory()) continue;

      const commandFiles = readdirSync(folderPath).filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const command: Command = require(filePath).default;

        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`   ✓ ${command.data.name} chargée`);
        } else {
          console.warn(
            `⚠️ La commande ${file} ne possède pas les propriétés requises.`
          );
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des commandes:', error);
    throw error;
  }
}

/**
 * Déploie les commandes sur Discord
 */
async function deployCommands(): Promise<void> {
  console.log('🔄 Chargement des commandes...');
  loadCommandsData();
  console.log(`✅ ${commands.length} commande(s) chargée(s)\n`);

  const rest = new REST().setToken(config.token);

  try {
    console.log('🔄 Déploiement des commandes slash sur Discord...');
    console.log(`📍 Guild ID: ${config.guildId}`);
    console.log(`🤖 Client ID: ${config.clientId}\n`);

    // Déploiement des commandes pour le serveur spécifique (plus rapide)
    const data: any = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log(`✅ ${data.length} commande(s) déployée(s) avec succès !`);
    console.log('\n📋 Commandes déployées:');
    
    data.forEach((cmd: any) => {
      console.log(`   • /${cmd.name} - ${cmd.description}`);
    });

    console.log('\n💡 Les commandes sont maintenant disponibles sur votre serveur !');
    console.log('💡 Note: Pour déployer globalement, modifiez le script pour utiliser Routes.applicationCommands()');
    
  } catch (error: any) {
    console.error('\n❌ Erreur lors du déploiement des commandes:');
    
    if (error.code === 50001) {
      console.error('➜ Le bot n\'a pas accès à ce serveur (GUILD_ID invalide)');
    } else if (error.code === 10002) {
      console.error('➜ Application inconnue (CLIENT_ID invalide)');
    } else if (error.status === 401) {
      console.error('➜ Token invalide ou expiré');
    } else {
      console.error(error);
    }
    
    process.exit(1);
  }
}

// Exécution du script
deployCommands().catch(console.error);
