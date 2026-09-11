import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('🔧 [DEV] Envoie une annonce dans un canal')
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Le canal où envoyer l\'annonce')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('titre')
        .setDescription('Le titre de l\'annonce')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Le contenu de l\'annonce')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('couleur')
        .setDescription('La couleur de l\'embed (hex)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('image')
        .setDescription('URL de l\'image à afficher')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('mention_everyone')
        .setDescription('Mentionner @everyone')
        .setRequired(false)
    ),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal', true) as TextChannel;
    const title = interaction.options.getString('titre', true);
    const message = interaction.options.getString('message', true);
    const colorHex = interaction.options.getString('couleur');
    const imageUrl = interaction.options.getString('image');
    const mentionEveryone = interaction.options.getBoolean('mention_everyone') || false;

    await interaction.deferReply({ ephemeral: true });

    // Vérifier que c'est un canal textuel
    if (!channel.isTextBased() || channel.isDMBased()) {
      await interaction.editReply({
        content: '❌ Le canal sélectionné n\'est pas un canal textuel valide.',
      });
      return;
    }

    // Convertir la couleur hex en nombre
    let color = 0x5865F2; // Couleur par défaut (bleu Discord)
    if (colorHex) {
      const cleanHex = colorHex.replace('#', '');
      const parsedColor = parseInt(cleanHex, 16);
      if (!isNaN(parsedColor)) {
        color = parsedColor;
      }
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(message)
        .setFooter({ 
          text: `Annonce par ${interaction.user.tag}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      if (imageUrl) {
        embed.setImage(imageUrl);
      }

      const content = mentionEveryone ? '@everyone' : undefined;

      await channel.send({ 
        content, 
        embeds: [embed],
        allowedMentions: { parse: mentionEveryone ? ['everyone'] : [] }
      });

      await interaction.editReply({
        content: `✅ Annonce envoyée avec succès dans ${channel} !`,
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'annonce:', error);
      await interaction.editReply({
        content: '❌ Une erreur s\'est produite lors de l\'envoi de l\'annonce. Vérifiez les permissions du bot.',
      });
    }
  },
};

export default command;
