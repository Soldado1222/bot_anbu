import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  ActivityType,
  PresenceStatusData
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('🔧 [DEV] Change le statut du bot')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Le type d\'activité')
        .setRequired(true)
        .addChoices(
          { name: '🎮 Joue à', value: 'playing' },
          { name: '🎵 Écoute', value: 'listening' },
          { name: '📺 Regarde', value: 'watching' },
          { name: '🎯 Participe à', value: 'competing' }
        )
    )
    .addStringOption(option =>
      option
        .setName('texte')
        .setDescription('Le texte du statut')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('etat')
        .setDescription('L\'état de présence')
        .setRequired(false)
        .addChoices(
          { name: '🟢 En ligne', value: 'online' },
          { name: '🌙 Inactif', value: 'idle' },
          { name: '🔴 Ne pas déranger', value: 'dnd' },
          { name: '⚫ Invisible', value: 'invisible' }
        )
    ),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const typeChoice = interaction.options.getString('type', true);
    const text = interaction.options.getString('texte', true);
    const statusChoice = interaction.options.getString('etat') || 'online';

    // Mapper les choix aux types Discord.js
    const activityTypeMap: { [key: string]: ActivityType } = {
      playing: ActivityType.Playing,
      listening: ActivityType.Listening,
      watching: ActivityType.Watching,
      competing: ActivityType.Competing,
    };

    const activityType = activityTypeMap[typeChoice];
    const status = statusChoice as PresenceStatusData;

    try {
      await interaction.client.user?.setPresence({
        activities: [{ name: text, type: activityType }],
        status: status,
      });

      const statusEmojis: { [key: string]: string } = {
        online: '🟢',
        idle: '🌙',
        dnd: '🔴',
        invisible: '⚫',
      };

      const activityEmojis: { [key: string]: string } = {
        playing: '🎮',
        listening: '🎵',
        watching: '📺',
        competing: '🎯',
      };

      await interaction.reply({
        content: 
          `✅ Statut modifié avec succès !\n\n` +
          `${statusEmojis[statusChoice]} État: **${statusChoice}**\n` +
          `${activityEmojis[typeChoice]} Activité: **${text}**`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors du changement de statut.',
        ephemeral: true,
      });
    }
  },
};

export default command;
