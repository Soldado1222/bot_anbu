import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder 
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Affiche les informations sur le bot'),

  async execute(interaction: ChatInputCommandInteraction) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const uptimeString = 
      `${days > 0 ? `${days}j ` : ''}` +
      `${hours > 0 ? `${hours}h ` : ''}` +
      `${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Informations du Bot')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { 
          name: '🤖 Bot', 
          value: `${interaction.client.user.tag}`, 
          inline: true 
        },
        { 
          name: '🆔 ID', 
          value: `${interaction.client.user.id}`, 
          inline: true 
        },
        { 
          name: '⏰ Uptime', 
          value: uptimeString, 
          inline: true 
        },
        { 
          name: '📊 Serveurs', 
          value: `${interaction.client.guilds.cache.size}`, 
          inline: true 
        },
        { 
          name: '👥 Utilisateurs', 
          value: `${interaction.client.users.cache.size}`, 
          inline: true 
        },
        { 
          name: '💓 Ping', 
          value: `${interaction.client.ws.ping}ms`, 
          inline: true 
        },
        { 
          name: '📚 Version', 
          value: 'v1.0.0', 
          inline: true 
        },
        { 
          name: '⚡ Discord.js', 
          value: 'v14', 
          inline: true 
        },
        { 
          name: '🟢 Node.js', 
          value: process.version, 
          inline: true 
        }
      )
      .setFooter({ 
        text: `Demandé par ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
