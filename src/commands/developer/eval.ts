import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { Command } from '../../types';
import { inspect } from 'util';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('🔧 [DEV] Évalue du code JavaScript')
    .addStringOption(option =>
      option
        .setName('code')
        .setDescription('Le code à évaluer')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('async')
        .setDescription('Exécuter en mode asynchrone')
        .setRequired(false)
    ),
  
  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('code', true);
    const isAsync = interaction.options.getBoolean('async') || false;

    await interaction.deferReply({ ephemeral: true });

    try {
      let evaled;
      const start = Date.now();

      if (isAsync) {
        evaled = await eval(`(async () => { ${code} })()`);
      } else {
        evaled = eval(code);
      }

      const executionTime = Date.now() - start;

      // Formater le résultat
      let result = evaled;
      if (typeof evaled !== 'string') {
        result = inspect(evaled, { depth: 0, maxArrayLength: 10 });
      }

      // Limiter la longueur du résultat
      if (result.length > 1900) {
        result = result.substring(0, 1900) + '...';
      }

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Évaluation réussie')
        .addFields(
          { 
            name: '📥 Entrée', 
            value: `\`\`\`js\n${code.substring(0, 1000)}\`\`\``, 
            inline: false 
          },
          { 
            name: '📤 Sortie', 
            value: `\`\`\`js\n${result}\`\`\``, 
            inline: false 
          },
          { 
            name: '⏱️ Temps d\'exécution', 
            value: `${executionTime}ms`, 
            inline: true 
          },
          { 
            name: '🔄 Type', 
            value: typeof evaled, 
            inline: true 
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Erreur d\'évaluation')
        .addFields(
          { 
            name: '📥 Entrée', 
            value: `\`\`\`js\n${code.substring(0, 1000)}\`\`\``, 
            inline: false 
          },
          { 
            name: '💥 Erreur', 
            value: `\`\`\`js\n${error.message || error}\`\`\``, 
            inline: false 
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

export default command;
