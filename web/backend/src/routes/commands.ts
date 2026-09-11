import { Router } from 'express';
import { Client } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

// Interface pour les commandes personnalisées
interface CustomCommand {
  id: string;
  name: string;
  description: string;
  response: string;
  category: 'fun' | 'utility' | 'moderation' | 'custom';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const COMMANDS_FILE = path.join(process.cwd(), 'data', 'custom-commands.json');

// Créer le dossier data s'il n'existe pas
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Charger les commandes depuis le fichier
async function loadCommands(): Promise<CustomCommand[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(COMMANDS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Sauvegarder les commandes dans le fichier
async function saveCommands(commands: CustomCommand[]) {
  await ensureDataDir();
  await fs.writeFile(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

export function createCommandsRoutes(client: Client) {
  const router = Router();

  // Lister toutes les commandes (built-in + custom)
  router.get('/', async (req, res) => {
    try {
      // Commandes built-in (depuis les fichiers)
      const builtInCommands = [
        { name: 'ping', description: 'Vérifier la latence du bot', category: 'utility', type: 'built-in' },
        { name: 'help', description: 'Afficher la liste des commandes', category: 'utility', type: 'built-in' },
        { name: 'info', description: 'Informations sur le bot', category: 'utility', type: 'built-in' },
        { name: 'serverinfo', description: 'Informations sur le serveur', category: 'utility', type: 'built-in' },
        { name: 'userinfo', description: 'Informations sur un utilisateur', category: 'utility', type: 'built-in' },
        { name: 'ban', description: 'Bannir un utilisateur', category: 'moderation', type: 'built-in' },
        { name: 'kick', description: 'Expulser un utilisateur', category: 'moderation', type: 'built-in' },
        { name: 'timeout', description: 'Timeout un utilisateur', category: 'moderation', type: 'built-in' },
        { name: 'clear', description: 'Supprimer des messages', category: 'moderation', type: 'built-in' },
        { name: 'warn', description: 'Avertir un utilisateur', category: 'moderation', type: 'built-in' },
        { name: 'unban', description: 'Débannir un utilisateur', category: 'moderation', type: 'built-in' },
        { name: 'untimeout', description: 'Retirer le timeout d\'un utilisateur', category: 'moderation', type: 'built-in' },
      ];

      // Commandes personnalisées
      const customCommands = await loadCommands();

      res.json({
        builtIn: builtInCommands,
        custom: customCommands,
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du chargement des commandes' });
    }
  });

  // Créer une nouvelle commande personnalisée
  router.post('/', async (req, res) => {
    try {
      const { name, description, response, category = 'custom' } = req.body;
      const user = req.user as any;

      if (!name || !description || !response) {
        return res.status(400).json({ error: 'Nom, description et réponse requis' });
      }

      const commands = await loadCommands();

      // Vérifier si la commande existe déjà
      if (commands.find(cmd => cmd.name.toLowerCase() === name.toLowerCase())) {
        return res.status(409).json({ error: 'Une commande avec ce nom existe déjà' });
      }

      const newCommand: CustomCommand = {
        id: Date.now().toString(),
        name: name.toLowerCase(),
        description,
        response,
        category,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.id || 'unknown',
      };

      commands.push(newCommand);
      await saveCommands(commands);

      res.status(201).json(newCommand);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la création de la commande' });
    }
  });

  // Modifier une commande personnalisée
  router.put('/:commandId', async (req, res) => {
    try {
      const { commandId } = req.params;
      const { name, description, response, category, enabled } = req.body;

      const commands = await loadCommands();
      const commandIndex = commands.findIndex(cmd => cmd.id === commandId);

      if (commandIndex === -1) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      // Mettre à jour la commande
      if (name) commands[commandIndex].name = name.toLowerCase();
      if (description) commands[commandIndex].description = description;
      if (response) commands[commandIndex].response = response;
      if (category) commands[commandIndex].category = category;
      if (enabled !== undefined) commands[commandIndex].enabled = enabled;
      commands[commandIndex].updatedAt = new Date().toISOString();

      await saveCommands(commands);

      res.json(commands[commandIndex]);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la modification de la commande' });
    }
  });

  // Supprimer une commande personnalisée
  router.delete('/:commandId', async (req, res) => {
    try {
      const { commandId } = req.params;

      const commands = await loadCommands();
      const filteredCommands = commands.filter(cmd => cmd.id !== commandId);

      if (filteredCommands.length === commands.length) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      await saveCommands(filteredCommands);

      res.json({ message: 'Commande supprimée avec succès' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la suppression de la commande' });
    }
  });

  // Activer/Désactiver une commande
  router.patch('/:commandId/toggle', async (req, res) => {
    try {
      const { commandId } = req.params;

      const commands = await loadCommands();
      const command = commands.find(cmd => cmd.id === commandId);

      if (!command) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      command.enabled = !command.enabled;
      command.updatedAt = new Date().toISOString();

      await saveCommands(commands);

      res.json(command);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du changement de statut' });
    }
  });

  return router;
}
