import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder 
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Affiche les informations du serveur'),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: '❌ Cette commande ne peut être utilisée qu\'en serveur.',
        ephemeral: true,
      });
      return;
    }

    // Récupérer les informations complètes du serveur
    await guild.fetch();

    const owner = await guild.fetchOwner();
    
    // Compteurs de membres
    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(member => !member.user.bot).size;
    const bots = guild.members.cache.filter(member => member.user.bot).size;

    // Compteurs de canaux
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;

    // Niveau de vérification
    const verificationLevels: { [key: number]: string } = {
      0: 'Aucune',
      1: 'Faible',
      2: 'Moyen',
      3: 'Élevé',
      4: 'Très élevé',
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🏰 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }) || '')
      .addFields(
        { 
          name: '🆔 ID du Serveur', 
          value: guild.id, 
          inline: true 
        },
        { 
          name: '👑 Propriétaire', 
          value: owner.user.tag, 
          inline: true 
        },
        { 
          name: '📅 Créé le', 
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, 
          inline: false 
        },
        { 
          name: `👥 Membres [${totalMembers}]`, 
          value: `👤 Humains: ${humans}\n🤖 Bots: ${bots}`, 
          inline: true 
        },
        { 
          name: `📝 Canaux [${guild.channels.cache.size}]`, 
          value: `💬 Texte: ${textChannels}\n🔊 Vocal: ${voiceChannels}\n📁 Catégories: ${categories}`, 
          inline: true 
        },
        { 
          name: `🎭 Rôles`, 
          value: `${guild.roles.cache.size}`, 
          inline: true 
        },
        { 
          name: '😊 Émojis', 
          value: `${guild.emojis.cache.size}`, 
          inline: true 
        },
        { 
          name: '💎 Boosts', 
          value: `Niveau ${guild.premiumTier}\n${guild.premiumSubscriptionCount || 0} boost(s)`, 
          inline: true 
        },
        { 
          name: '🔒 Vérification', 
          value: verificationLevels[guild.verificationLevel], 
          inline: true 
        }
      )
      .setFooter({ 
        text: `Demandé par ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ size: 1024 }) || '');
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
