import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  Client
} from 'discord.js';
import { Command } from '../../types';
import { isDeveloper } from '../../config';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste de toutes les commandes disponibles'),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as Client & { commands: Map<string, Command> };
    const commands = client.commands;
    const isDevUser = isDeveloper(interaction.user.id);

    const communityCommands = Array.from(commands.values())
      .filter((cmd: Command) => !cmd.devOnly)
      .map((cmd: Command) => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
      .join('\n');

    const devCommands = Array.from(commands.values())
      .filter((cmd: Command) => cmd.devOnly)
      .map((cmd: Command) => `\`/${cmd.data.name}\` - ${cmd.data.description}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📚 Liste des Commandes')
      .setDescription('Voici toutes les commandes disponibles du bot.')
      .addFields({
        name: '👥 Commandes Communautaires',
        value: communityCommands || 'Aucune commande disponible',
      })
      .setFooter({ 
        text: `Demandé par ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();

    if (isDevUser && devCommands) {
      embed.addFields({
        name: '🔧 Commandes Développeur',
        value: devCommands,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
