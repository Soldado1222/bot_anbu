import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction 
} from 'discord.js';
import { Command } from '../../types';
import { reloadCommand } from '../../handlers/commandHandler';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('🔧 [DEV] Recharge une commande sans redémarrer le bot')
    .addStringOption(option =>
      option
        .setName('commande')
        .setDescription('Le nom de la commande à recharger')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('commande', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const success = await reloadCommand(interaction.client, commandName);

      if (success) {
        await interaction.editReply({
          content: `✅ La commande \`${commandName}\` a été rechargée avec succès !`,
        });
      } else {
        await interaction.editReply({
          content: `❌ Impossible de recharger la commande \`${commandName}\`. Vérifiez qu'elle existe.`,
        });
      }
    } catch (error) {
      console.error('Erreur lors du rechargement:', error);
      await interaction.editReply({
        content: `❌ Une erreur s'est produite lors du rechargement de \`${commandName}\`.\n\`\`\`${error}\`\`\``,
      });
    }
  },
};

export default command;
