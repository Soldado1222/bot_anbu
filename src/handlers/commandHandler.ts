import { Client, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from '../types';

// Extension du type Client pour inclure commands
interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

/**
 * Charge toutes les commandes depuis le dossier commands
 * @param client - Instance du client Discord
 */
export async function loadCommands(client: Client): Promise<void> {
  const extClient = client as ExtendedClient;
  const commandsPath = join(__dirname, '../commands');
  
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

        // Vérifier que la commande a les propriétés nécessaires
        if ('data' in command && 'execute' in command) {
          extClient.commands.set(command.data.name, command);
          console.log(`   ✓ ${command.data.name} (${folder})`);
        } else {
          console.warn(
            `⚠️ La commande ${file} ne possède pas les propriétés "data" et "execute" requises.`
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
 * Recharge une commande spécifique
 * @param client - Instance du client Discord
 * @param commandName - Nom de la commande à recharger
 */
export async function reloadCommand(
  client: Client,
  commandName: string
): Promise<boolean> {
  const extClient = client as ExtendedClient;
  const command = extClient.commands.get(commandName);

  if (!command) {
    return false;
  }

  const commandsPath = join(__dirname, '../commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const stat = require('fs').statSync(folderPath);
    if (!stat.isDirectory()) continue;

    const commandFiles = readdirSync(folderPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      
      // Supprimer le module du cache
      delete require.cache[require.resolve(filePath)];
      
      try {
        const newCommand: Command = require(filePath).default;

        if (newCommand.data.name === commandName) {
          extClient.commands.set(newCommand.data.name, newCommand);
          return true;
        }
      } catch (error) {
        console.error(`❌ Erreur lors du rechargement de ${file}:`, error);
        return false;
      }
    }
  }

  return false;
}
