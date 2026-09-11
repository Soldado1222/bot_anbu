import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder
} from 'discord.js';

export interface Command {
  data: any; // Utilise any pour accepter tous les types de builders Discord.js
  devOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
