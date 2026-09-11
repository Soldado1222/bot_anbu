import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('🔨 [ADMIN] Expulse un membre du serveur')
    .addUserOption(option =>
      option
        .setName('membre')
        .setDescription('Le membre à expulser')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('raison')
        .setDescription('La raison de l\'expulsion')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
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

    // Vérifications de sécurité
    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: '❌ Vous ne pouvez pas vous expulser vous-même.',
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: '❌ Impossible d\'expulser le propriétaire du serveur.',
        ephemeral: true,
      });
      return;
    }

    if (member.id === interaction.client.user?.id) {
      await interaction.reply({
        content: '❌ Je ne peux pas m\'expulser moi-même.',
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: '❌ Je ne peux pas expulser ce membre. Il possède probablement un rôle supérieur au mien.',
        ephemeral: true,
      });
      return;
    }

    try {
      // Envoyer un message privé au membre avant de l'expulser
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFF9900)
          .setTitle('🔨 Vous avez été expulsé')
          .setDescription(`Vous avez été expulsé de **${interaction.guild.name}**`)
          .addFields(
            { name: '📋 Raison', value: reason },
            { name: '👤 Par', value: interaction.user.tag }
          )
          .setTimestamp();

        await member.send({ embeds: [dmEmbed] });
      } catch {
        // L'utilisateur a probablement désactivé les MPs
      }

      // Expulser le membre
      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Membre expulsé')
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: '👤 Membre', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: '🔨 Par', value: interaction.user.tag, inline: true },
          { name: '📋 Raison', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'expulsion:', error);
      await interaction.reply({
        content: '❌ Une erreur s\'est produite lors de l\'expulsion du membre.',
        ephemeral: true,
      });
    }
  },
};

export default command;
