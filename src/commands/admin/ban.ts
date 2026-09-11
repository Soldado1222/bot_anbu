import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 [ADMIN] Bannit un membre du serveur')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre à bannir')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('La raison du bannissement')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('supprimer_messages')
        .setDescription('Supprimer les messages des derniers X jours (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('membre', true);
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const deleteMessageDays = interaction.options.getInteger('supprimer_messages') || 0;
    
    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée qu\'en serveur.',
        ephemeral: true,
      });
      return;
    }

    const member = interaction.guild.members.cache.get(targetUser.id);

    // Vérifications de sécurité
    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas vous bannir vous-même.',
        ephemeral: true,
      });
      return;
    }

    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: '❌ Impossible de bannir le propriétaire du serveur.',
        ephemeral: true,
      });
      return;
    }

    if (targetUser.id === interaction.client.user?.id) {
      await interaction.reply({
        content: '❌ Je ne peux pas me bannir moi-même.',
        ephemeral: true,
      });
      return;
    }

    if (member && !member.bannable) {
      await interaction.reply({
        content: '❌ Je ne peux pas bannir ce membre. Il possède probablement un rôle supérieur au mien.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Envoyer un message privé au membre avant de le bannir
      if (member) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔨 Vous avez été banni')
            .setDescription(`Vous avez été banni de **${interaction.guild.name}**`)
            .addFields(
              { name: '📋 Raison', value: reason },
              { name: '👤 Par', value: interaction.user.tag }
            )
            .setTimestamp();

          await member.send({ embeds: [dmEmbed] });
        } catch {
          // L'utilisateur a probablement désactivé les MPs
        }
      }

      // Bannir le membre
      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} | Par: ${interaction.user.tag}`,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
      });

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🔨 Membre banni')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '👤 Membre', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '🔨 Par', value: interaction.user.tag, inline: true },
          { name: '📋 Raison', value: reason, inline: false },
          { 
            name: '🗑️ Messages supprimés', 
            value: deleteMessageDays > 0 ? `${deleteMessageDays} jour(s)` : 'Aucun',
            inline: true 
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du bannissement:', error);
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors du bannissement du membre.',
        ephemeral: true,
      });
    }
  },
};

export default command;
