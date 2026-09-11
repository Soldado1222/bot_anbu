import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('🔓 [ADMIN] Débannit un utilisateur du serveur')
    .addStringOption(option =>
      option
        .setName('user_id')
        .setDescription('L\'ID de l\'utilisateur à débannir')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('La raison du débannissement')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée qu\'en serveur.',
        ephemeral: true,
      });
      return;
    }

    // Vérifier que l'ID est valide
    if (!/^\d{17,19}$/.test(userId)) {
      await interaction.reply({
        content: '❌ ID utilisateur invalide. L\'ID doit être composé de 17 à 19 chiffres.',
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply();

      // Vérifier si l'utilisateur est banni
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        await interaction.editReply({
          content: '❌ Cet utilisateur n\'est pas banni sur ce serveur.',
        });
        return;
      }

      // Débannir l'utilisateur
      await interaction.guild.members.unban(userId, `${reason} | Par: ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔓 Utilisateur débanni')
        .setThumbnail(bannedUser.user.displayAvatarURL())
        .addFields(
          { name: '👤 Utilisateur', value: `${bannedUser.user.tag} (${userId})`, inline: true },
          { name: '🔓 Par', value: interaction.user.tag, inline: true },
          { name: '📋 Raison', value: reason, inline: false },
          { 
            name: '📝 Raison du ban initial', 
            value: bannedUser.reason || 'Aucune raison enregistrée',
            inline: false 
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du débannissement:', error);
      await interaction.editReply({
        content: '❌ Une erreur s\'est produite lors du débannissement de l\'utilisateur.',
      });
    }
  },
};

export default command;
