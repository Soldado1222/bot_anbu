import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Affiche la latence du bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ 
      content: '🏓 Pong! Calcul de la latence...', 
      fetchReply: true 
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\n` +
      `📡 Latence: **${latency}ms**\n` +
      `💓 API Discord: **${apiLatency}ms**`
    );
  },
};

export default command;
