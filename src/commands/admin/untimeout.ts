import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('⏰ [ADMIN] Retire le timeout d\'un membre')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre dont retirer le timeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('La raison du retrait du timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('membre', true);
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée qu\'en serveur.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.guild.members.cache.get(targetUser.id);

    if (!member) {
      await interaction.reply({
        content: '❌ Membre introuvable sur ce serveur.',
        ephemeral: true,
      });
      return;
    }

    if (!member.isCommunicationDisabled()) {
      await interaction.reply({
        content: '❌ Ce membre n\'est pas en timeout.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Retirer le timeout
      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Timeout retiré')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '👤 Membre', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '✅ Par', value: interaction.user.tag, inline: true },
          { name: '📋 Raison', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Envoyer un MP au membre
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Votre timeout a été retiré')
          .setDescription(`Votre timeout a été retiré dans **${interaction.guild.name}**`)
          .addFields(
            { name: '📋 Raison', value: reason },
            { name: '👤 Par', value: interaction.user.tag }
          )
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch {
        // L'utilisateur a probablement désactivé les MPs
      }

    } catch (error) {
      console.error('Erreur lors du retrait du timeout:', error);
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors du retrait du timeout.',
        ephemeral: true,
      });
    }
  },
};

export default command;
