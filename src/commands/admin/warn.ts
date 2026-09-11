import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ [ADMIN] Avertit un membre')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre à avertir')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('La raison de l\'avertissement')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('membre', true);
    const reason = interaction.options.getString('raison', true);
    
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
        content: '❌ Vous ne pouvez pas vous avertir vous-même.',
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: '❌ Impossible d\'avertir le propriétaire du serveur.',
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.client.user?.id) {
      await interaction.reply({
        content: '❌ Je ne peux pas m\'avertir moi-même.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Envoyer un MP au membre
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('⚠️ Vous avez reçu un avertissement')
        .setDescription(`Vous avez reçu un avertissement dans **${interaction.guild.name}**`)
        .addFields(
          { name: '📋 Raison', value: reason },
          { name: '👤 Par', value: interaction.user.tag }
        )
        .setFooter({ text: 'Veuillez respecter les règles du serveur.' })
        .setTimestamp();

      let dmSent = true;
      try {
        await member.send({ embeds: [dmEmbed] });
      } catch {
        dmSent = false;
      }

      // Réponse dans le canal
      const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('⚠️ Membre averti')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '👤 Membre', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '⚠️ Par', value: interaction.user.tag, inline: true },
          { name: '📋 Raison', value: reason, inline: false },
          { 
            name: '📨 Message privé', 
            value: dmSent ? '✅ Envoyé' : '❌ Non envoyé (MPs désactivés)', 
            inline: false 
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'avertissement:', error);
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors de l\'avertissement du membre.',
        ephemeral: true,
      });
    }
  },
};

export default command;
