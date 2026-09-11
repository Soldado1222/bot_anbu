import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  User
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Affiche les informations d\'un utilisateur')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('L\'utilisateur dont vous voulez voir les informations')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('👤 Informations Utilisateur')
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { 
          name: '🏷️ Nom d\'utilisateur', 
          value: targetUser.tag, 
          inline: true 
        },
        { 
          name: '🆔 ID', 
          value: targetUser.id, 
          inline: true 
        },
        { 
          name: '🤖 Bot', 
          value: targetUser.bot ? 'Oui' : 'Non', 
          inline: true 
        },
        { 
          name: '📅 Compte créé le', 
          value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, 
          inline: false 
        }
      );

    if (member) {
      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild?.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString())
        .slice(0, 10);

      embed.addFields(
        { 
          name: '🚪 A rejoint le serveur', 
          value: member.joinedAt 
            ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` 
            : 'Inconnu', 
          inline: false 
        },
        { 
          name: '🎨 Surnom', 
          value: member.nickname || 'Aucun', 
          inline: true 
        },
        { 
          name: `📋 Rôles [${member.roles.cache.size - 1}]`, 
          value: roles.length > 0 ? roles.join(', ') : 'Aucun rôle', 
          inline: false 
        }
      );

      if (member.premiumSince) {
        embed.addFields({
          name: '💎 Boost depuis',
          value: `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:F>`,
          inline: false
        });
      }
    }

    embed.setFooter({ 
      text: `Demandé par ${interaction.user.tag}`, 
      iconURL: interaction.user.displayAvatarURL() 
    })
    .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
