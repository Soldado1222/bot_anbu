import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { Command } from '../../types';
import { loadTwitchConfig, saveTwitchConfig } from '../../services/twitchMonitor';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('🔧 [DEV] Gère les notifications Twitch')

    // ── Sous-commande : ajouter un streamer ──────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Ajouter un streamer à surveiller')
        .addStringOption(opt =>
          opt.setName('streamer')
            .setDescription('Nom du compte Twitch (ex: xqc)')
            .setRequired(true)
        )
    )

    // ── Sous-commande : retirer un streamer ──────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Retirer un streamer de la surveillance')
        .addStringOption(opt =>
          opt.setName('streamer')
            .setDescription('Nom du compte Twitch à retirer')
            .setRequired(true)
        )
    )

    // ── Sous-commande : définir le canal de notif ────────────────────────────
    .addSubcommand(sub =>
      sub.setName('setchannel')
        .setDescription('Définir le canal Discord pour les notifications')
        .addChannelOption(opt =>
          opt.setName('canal')
            .setDescription('Canal où envoyer les alertes live')
            .setRequired(true)
        )
    )

    // ── Sous-commande : définir le rôle à mentionner ─────────────────────────
    .addSubcommand(sub =>
      sub.setName('setrole')
        .setDescription('Définir le rôle à mentionner lors d\'un live')
        .addRoleOption(opt =>
          opt.setName('role')
            .setDescription('Rôle à ping (@everyone = laisser vide)')
            .setRequired(false)
        )
    )

    // ── Sous-commande : liste des streamers ──────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Voir tous les streamers surveillés et la config')
    )

    // ── Sous-commande : test notification ────────────────────────────────────
    .addSubcommand(sub =>
      sub.setName('test')
        .setDescription('Envoyer une notification de test dans le canal configuré')
    ),

  devOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const config = await loadTwitchConfig();

    // ── add ──────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      const streamer = interaction.options.getString('streamer', true).toLowerCase().trim();

      if (config.channels.includes(streamer)) {
        await interaction.editReply(`⚠️ **${streamer}** est déjà dans la liste.`);
        return;
      }

      config.channels.push(streamer);
      await saveTwitchConfig(config);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x9146FF)
          .setTitle('✅ Streamer ajouté')
          .setDescription(`**${streamer}** sera notifié dans <#${config.notifyChannelId || 'non configuré'}> dès qu'il sera en live.`)
          .setFooter({ text: `${config.channels.length} streamer(s) surveillé(s)` })
        ]
      });
      return;
    }

    // ── remove ───────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      const streamer = interaction.options.getString('streamer', true).toLowerCase().trim();

      if (!config.channels.includes(streamer)) {
        await interaction.editReply(`❌ **${streamer}** n'est pas dans la liste.`);
        return;
      }

      config.channels = config.channels.filter(c => c !== streamer);
      await saveTwitchConfig(config);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('🗑️ Streamer retiré')
          .setDescription(`**${streamer}** ne sera plus surveillé.`)
          .setFooter({ text: `${config.channels.length} streamer(s) restant(s)` })
        ]
      });
      return;
    }

    // ── setchannel ───────────────────────────────────────────────────────────
    if (sub === 'setchannel') {
      const channel = interaction.options.getChannel('canal', true) as TextChannel;

      if (!channel.isTextBased() || channel.isDMBased()) {
        await interaction.editReply('❌ Sélectionne un canal textuel valide.');
        return;
      }

      config.notifyChannelId = channel.id;
      await saveTwitchConfig(config);

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x9146FF)
          .setTitle('✅ Canal configuré')
          .setDescription(`Les notifications Twitch seront envoyées dans <#${channel.id}>.`)
        ]
      });
      return;
    }

    // ── setrole ──────────────────────────────────────────────────────────────
    if (sub === 'setrole') {
      const role = interaction.options.getRole('role');

      if (role) {
        config.roleId = role.id;
        await saveTwitchConfig(config);
        await interaction.editReply(`✅ Le rôle <@&${role.id}> sera mentionné lors des lives.`);
      } else {
        config.roleId = undefined;
        await saveTwitchConfig(config);
        await interaction.editReply('✅ Aucun rôle ne sera mentionné lors des lives.');
      }
      return;
    }

    // ── list ─────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const channelMention = config.notifyChannelId
        ? `<#${config.notifyChannelId}>`
        : '❌ Non configuré';

      const roleMention = config.roleId
        ? `<@&${config.roleId}>`
        : 'Aucun';

      const streamerList = config.channels.length > 0
        ? config.channels.map((c, i) => `\`${i + 1}.\` [${c}](https://twitch.tv/${c})`).join('\n')
        : '*Aucun streamer configuré*';

      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x9146FF)
          .setTitle('📋 Configuration Twitch')
          .addFields(
            { name: '📢 Canal de notification', value: channelMention, inline: true },
            { name: '🔔 Rôle mentionné', value: roleMention, inline: true },
            { name: `👤 Streamers surveillés (${config.channels.length})`, value: streamerList },
          )
          .setFooter({ text: 'Vérification toutes les 60 secondes' })
        ]
      });
      return;
    }

    // ── test ─────────────────────────────────────────────────────────────────
    if (sub === 'test') {
      if (!config.notifyChannelId) {
        await interaction.editReply('❌ Aucun canal configuré. Utilise `/twitch setchannel` d\'abord.');
        return;
      }

      try {
        const channel = await interaction.client.channels.fetch(config.notifyChannelId) as TextChannel;
        if (!channel?.isTextBased()) {
          await interaction.editReply('❌ Le canal configuré est invalide.');
          return;
        }

        const testEmbed = new EmbedBuilder()
          .setColor(0x9146FF)
          .setAuthor({ name: '🔴 Live sur Twitch !' })
          .setTitle('🧪 Ceci est une notification de test')
          .setURL('https://twitch.tv')
          .addFields(
            { name: '👤 Streamer', value: 'StreamerTest', inline: true },
            { name: '🎮 Jeu', value: 'Just Chatting', inline: true },
            { name: '👀 Viewers', value: '1337', inline: true },
          )
          .setFooter({ text: 'twitch.tv/test' })
          .setTimestamp();

        const mention = config.roleId ? `<@&${config.roleId}> ` : '';
        await channel.send({
          content: `${mention}**StreamerTest** est en live sur Twitch ! 🔴 *(test)*`,
          embeds: [testEmbed],
        });

        await interaction.editReply(`✅ Notification de test envoyée dans <#${config.notifyChannelId}> !`);
      } catch (err) {
        console.error('Erreur test Twitch:', err);
        await interaction.editReply('❌ Erreur lors de l\'envoi. Vérifie les permissions du bot dans le canal.');
      }
    }
  },
};

export default command;
