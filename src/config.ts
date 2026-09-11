import dotenv from 'dotenv';

dotenv.config();

interface Config {
  token: string;
  clientId: string;
  guildId: string;
  devIds: string[];
}

// Validation de la configuration
function validateConfig(): Config {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const devIds = process.env.DEV_IDS?.split(',').filter(id => id.trim() !== '') || [];

  if (!token) {
    throw new Error('❌ DISCORD_TOKEN manquant dans le fichier .env');
  }

  if (!clientId) {
    throw new Error('❌ CLIENT_ID manquant dans le fichier .env');
  }

  if (!guildId) {
    throw new Error('❌ GUILD_ID manquant dans le fichier .env');
  }

  return {
    token,
    clientId,
    guildId,
    devIds
  };
}

export const config = validateConfig();

// Fonction pour vérifier si un utilisateur est développeur
export function isDeveloper(userId: string): boolean {
  return config.devIds.includes(userId);
}
