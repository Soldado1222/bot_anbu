import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('⏰ [ADMIN] Met un membre en timeout (mute temporaire)')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre à mettre en timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duree')
        .setDescription('Durée du timeout en minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320) // 28 jours maximum
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('La raison du timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('membre', true);
    const duration = interaction.options.getInteger('duree', true);
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

    // Vérifications de sécurité
    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas vous mettre en timeout vous-même.',
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: '❌ Impossible de mettre le propriétaire du serveur en timeout.',
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.client.user?.id) {
      await interaction.reply({
        content: '❌ Je ne peux pas me mettre en timeout moi-même.',
        ephemeral: true,
      });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({
        content: '❌ Je ne peux pas mettre ce membre en timeout. Il possède probablement un rôle supérieur au mien.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Calculer la durée en millisecondes
      const durationMs = duration * 60 * 1000;

      // Mettre le membre en timeout
      await member.timeout(durationMs, reason);

      // Calculer l'heure de fin
      const endsAt = Math.floor((Date.now() + durationMs) / 1000);

      const embed = new EmbedBuilder()
        .setColor(0xFF9900)
        .setTitle('⏰ Membre mis en timeout')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '👤 Membre', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '⏰ Par', value: interaction.user.tag, inline: true },
          { name: '⏱️ Durée', value: `${duration} minute(s)`, inline: true },
          { name: '🕐 Fin du timeout', value: `<t:${endsAt}:F> (<t:${endsAt}:R>)`, inline: false },
          { name: '📋 Raison', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Envoyer un MP au membre
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle('⏰ Vous avez été mis en timeout')
          .setDescription(`Vous avez été mis en timeout dans **${interaction.guild.name}**`)
          .addFields(
            { name: '⏱️ Durée', value: `${duration} minute(s)` },
            { name: '📋 Raison', value: reason },
            { name: '👤 Par', value: interaction.user.tag },
            { name: '🕐 Fin', value: `<t:${endsAt}:F>` }
          )
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch {
        // L'utilisateur a probablement désactivé les MPs
      }

    } catch (error) {
      console.error('Erreur lors du timeout:', error);
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors de la mise en timeout du membre.',
        ephemeral: true,
      });
    }
  },
};

export default command;
