import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('🗑️ [ADMIN] Supprime des messages dans un canal')
    .addIntegerOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre de messages à supprimer (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Supprimer uniquement les messages de cet utilisateur')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('bots')
        .setDescription('Supprimer uniquement les messages des bots')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const amount = interaction.options.getInteger('nombre', true);
    const targetUser = interaction.options.getUser('utilisateur');
    const botsOnly = interaction.options.getBoolean('bots') || false;

    if (!interaction.guild) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée qu\'en serveur.',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel as TextChannel;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée que dans un canal textuel.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Récupérer les messages
      let messages = await channel.messages.fetch({ limit: amount });

      // Filtrer si nécessaire
      if (targetUser) {
        messages = messages.filter(msg => msg.author.id === targetUser.id);
      }

      if (botsOnly) {
        messages = messages.filter(msg => msg.author.bot);
      }

      // Filtrer les messages de plus de 14 jours (limitation Discord)
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      messages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

      if (messages.size === 0) {
        await interaction.editReply({
          content: '❌ Aucun message à supprimer trouvé avec ces critères.',
        });
        return;
      }

      // Supprimer les messages
      const deletedMessages = await channel.bulkDelete(messages, true);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🗑️ Messages supprimés')
        .addFields(
          { name: '📊 Nombre', value: `${deletedMessages.size} message(s)`, inline: true },
          { name: '📝 Canal', value: channel.toString(), inline: true },
          { name: '👤 Par', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      if (targetUser) {
        embed.addFields({ 
          name: '🎯 Filtre utilisateur', 
          value: targetUser.tag, 
          inline: true 
        });
      }

      if (botsOnly) {
        embed.addFields({ 
          name: '🤖 Filtre', 
          value: 'Bots uniquement', 
          inline: true 
        });
      }

      await interaction.editReply({ embeds: [embed] });

      // Supprimer le message de confirmation après 5 secondes
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch {
          // Message déjà supprimé ou erreur
        }
      }, 5000);

    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      await interaction.editReply({
        content: '❌ Une erreur s\'est produite lors de la suppression des messages. Note : les messages de plus de 14 jours ne peuvent pas être supprimés en masse.',
      });
    }
  },
};

export default command;
