import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Colors,
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 [ADMIN] Gestion du système de tickets')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Déployer le panneau de création de tickets')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal où envoyer le panneau de tickets')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('config')
        .setDescription('Configurer le système de tickets via un menu interactif')
    )
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Fermer le ticket actuel avec transcript')
        .addStringOption(opt =>
          opt
            .setName('raison')
            .setDescription('Raison de la fermeture')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ajouter un membre au ticket actuel')
        .addUserOption(opt =>
          opt.setName('membre').setDescription('Membre à ajouter').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Retirer un membre du ticket actuel')
        .addUserOption(opt =>
          opt.setName('membre').setDescription('Membre à retirer').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Voir tous les tickets ouverts du serveur')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  devOnly: false,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ Cette commande ne peut être utilisée qu\'en serveur.', ephemeral: true });
      return;
    }

    // ── SETUP ──────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      const targetChannel = interaction.options.getChannel('canal', true);

      await interaction.deferReply({ ephemeral: true });

      // Récupérer la config depuis le backend
      const ticketConfig = await fetchTicketConfig();

      const panelEmbed = new EmbedBuilder()
        .setColor(ticketConfig.embedColor as any || Colors.Blurple)
        .setTitle(ticketConfig.embedTitle || '🎫 Support & Tickets')
        .setDescription(
          ticketConfig.embedDescription ||
          '> Besoin d\'aide ? Ouvre un ticket et notre équipe te répondra.\n\n' +
          '**Catégories disponibles :**\n' +
          '🐛 **Bug** — Signaler un problème technique\n' +
          '💡 **Suggestion** — Proposer une idée\n' +
          '🤝 **Partenariat** — Demande de partenariat\n' +
          '❓ **Autre** — Toute autre question\n\n' +
          '*Clique sur le bouton ci-dessous pour créer ton ticket.*'
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined })
        .setTimestamp();

      if (ticketConfig.embedThumbnail) {
        panelEmbed.setThumbnail(ticketConfig.embedThumbnail);
      }

      const openRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:open')
          .setLabel('📩 Ouvrir un ticket')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket:my_tickets')
          .setLabel('📋 Mes tickets')
          .setStyle(ButtonStyle.Secondary)
      );

      const channel = interaction.guild.channels.cache.get(targetChannel.id) as any;
      if (!channel) {
        await interaction.editReply({ content: '❌ Canal introuvable.' });
        return;
      }

      await channel.send({ embeds: [panelEmbed], components: [openRow] });

      await interaction.editReply({
        content: `✅ Panneau de tickets déployé dans <#${targetChannel.id}>`,
      });
    }

    // ── CONFIG ─────────────────────────────────────────────────────────────
    else if (sub === 'config') {
      await interaction.deferReply({ ephemeral: true });

      const ticketConfig = await fetchTicketConfig();
      const channels = interaction.guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }));

      const categories = interaction.guild.channels.cache
        .filter(c => c.type === ChannelType.GuildCategory)
        .map(c => ({ id: c.id, name: c.name }));

      const roles = interaction.guild.roles.cache
        .filter(r => !r.managed && r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name }));

      const configEmbed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('⚙️ Configuration du système de tickets')
        .setDescription('Utilisez le menu déroulant pour configurer chaque option du système de tickets.')
        .addFields(
          {
            name: '📬 Canal de logs',
            value: ticketConfig.logChannelId
              ? `<#${ticketConfig.logChannelId}>`
              : '`Non configuré`',
            inline: true,
          },
          {
            name: '📁 Catégorie tickets',
            value: ticketConfig.categoryId
              ? `<#${ticketConfig.categoryId}>`
              : '`Non configurée`',
            inline: true,
          },
          {
            name: '👷 Rôle support',
            value: ticketConfig.supportRoleId
              ? `<@&${ticketConfig.supportRoleId}>`
              : '`Non configuré`',
            inline: true,
          },
          {
            name: '🎫 Tickets ouverts',
            value: `\`${ticketConfig.openTickets || 0}\``,
            inline: true,
          },
          {
            name: '✅ Tickets fermés',
            value: `\`${ticketConfig.closedTickets || 0}\``,
            inline: true,
          },
          {
            name: '🔢 Max tickets / user',
            value: `\`${ticketConfig.maxPerUser || 1}\``,
            inline: true,
          }
        )
        .setTimestamp();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket:config_select')
        .setPlaceholder('⚙️ Choisir une option à configurer...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Canal de logs')
            .setDescription('Définir le canal où les logs des tickets sont envoyés')
            .setValue('config:log_channel')
            .setEmoji('📬'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Catégorie des tickets')
            .setDescription('Définir la catégorie où les canaux de tickets sont créés')
            .setValue('config:category')
            .setEmoji('📁'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Rôle support')
            .setDescription('Définir le rôle qui a accès à tous les tickets')
            .setValue('config:support_role')
            .setEmoji('👷'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Message de l\'embed')
            .setDescription('Modifier le titre et la description du panneau')
            .setValue('config:embed_message')
            .setEmoji('✏️'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Maximum de tickets par utilisateur')
            .setDescription('Limiter le nombre de tickets simultanés par personne')
            .setValue('config:max_tickets')
            .setEmoji('🔢'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Couleur de l\'embed')
            .setDescription('Modifier la couleur de l\'embed du panneau')
            .setValue('config:embed_color')
            .setEmoji('🎨'),
        );

      const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.editReply({
        embeds: [configEmbed],
        components: [menuRow],
      });
    }

    // ── CLOSE ──────────────────────────────────────────────────────────────
    else if (sub === 'close') {
      const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
      await handleCloseTicket(interaction, raison);
    }

    // ── ADD ────────────────────────────────────────────────────────────────
    else if (sub === 'add') {
      const member = interaction.options.getMember('membre') as any;
      if (!member) {
        await interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
        return;
      }

      const channel = interaction.channel as any;
      if (!channel?.name?.startsWith('ticket-')) {
        await interaction.reply({
          content: '❌ Cette commande doit être utilisée dans un canal de ticket.',
          ephemeral: true,
        });
        return;
      }

      await channel.permissionOverwrites.edit(member, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ **${member.user.tag}** a été ajouté au ticket par ${interaction.user}.`);

      await interaction.reply({ embeds: [embed] });
    }

    // ── REMOVE ─────────────────────────────────────────────────────────────
    else if (sub === 'remove') {
      const member = interaction.options.getMember('membre') as any;
      if (!member) {
        await interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
        return;
      }

      const channel = interaction.channel as any;
      if (!channel?.name?.startsWith('ticket-')) {
        await interaction.reply({
          content: '❌ Cette commande doit être utilisée dans un canal de ticket.',
          ephemeral: true,
        });
        return;
      }

      await channel.permissionOverwrites.edit(member, {
        ViewChannel: false,
      });

      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription(`🚫 **${member.user.tag}** a été retiré du ticket par ${interaction.user}.`);

      await interaction.reply({ embeds: [embed] });
    }

    // ── LIST ───────────────────────────────────────────────────────────────
    else if (sub === 'list') {
      await interaction.deferReply({ ephemeral: true });

      const ticketChannels = interaction.guild.channels.cache.filter(c =>
        c.name.startsWith('ticket-') && c.type === ChannelType.GuildText
      );

      if (ticketChannels.size === 0) {
        await interaction.editReply({ content: '📭 Aucun ticket ouvert en ce moment.' });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`🎫 Tickets ouverts (${ticketChannels.size})`)
        .setDescription(
          ticketChannels
            .map(c => `<#${c.id}> — \`${c.name}\``)
            .join('\n')
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};

// ── Helper : fetch config ticket depuis le backend ──────────────────────────
export async function fetchTicketConfig(): Promise<any> {
  // Lire depuis le fichier local en priorité
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'tickets.json');
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(data);
      console.log('✅ Config tickets chargée depuis le fichier local');
      return config;
    }
  } catch (error) {
    console.warn('⚠️ Impossible de lire le fichier local tickets.json');
  }

  // Fallback : essayer de lire depuis le backend
  return new Promise((resolve) => {
    const https = require('https');
    const http = require('http');
    const BACKEND_URL = process.env.BACKEND_URL || 'https://bot-anbu.onrender.com';
    const url = `${BACKEND_URL}/internal/tickets`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 5000 }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => (data += chunk));
      res.on('end', () => {
        try {
          const config = JSON.parse(data);
          console.log('✅ Config tickets chargée depuis le backend');
          resolve(config);
        } catch {
          console.warn('⚠️ Erreur parsing config backend');
          resolve(defaultTicketConfig());
        }
      });
    });
    req.on('error', (err: any) => {
      console.warn('⚠️ Erreur connexion backend:', err.message);
      resolve(defaultTicketConfig());
    });
    req.on('timeout', () => { 
      req.destroy(); 
      console.warn('⚠️ Timeout backend');
      resolve(defaultTicketConfig()); 
    });
  });
}

export function defaultTicketConfig() {
  return {
    enabled: false,
    logChannelId: '',
    categoryId: '',
    supportRoleId: '',
    embedTitle: '🎫 Support & Tickets',
    embedDescription:
      '> Besoin d\'aide ? Ouvre un ticket et notre équipe te répondra.\n\n' +
      '**Catégories disponibles :**\n' +
      '🐛 **Bug** — Signaler un problème technique\n' +
      '💡 **Suggestion** — Proposer une idée\n' +
      '🤝 **Partenariat** — Demande de partenariat\n' +
      '❓ **Autre** — Toute autre question\n\n' +
      '*Clique sur le bouton ci-dessous pour créer ton ticket.*',
    embedColor: '#5865F2',
    embedThumbnail: '',
    maxPerUser: 1,
    openTickets: 0,
    closedTickets: 0,
    tickets: [] as TicketEntry[],
  };
}

export interface TicketEntry {
  id: string;
  channelId: string;
  userId: string;
  userTag: string;
  category: string;
  subject: string;
  createdAt: string;
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
}

// ── Helper : sauvegarder config ticket ─────────────────────────────────────
export async function saveTicketConfig(config: any): Promise<void> {
  // Sauvegarder en local en priorité
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'tickets.json');
    
    // Créer le dossier data/ s'il n'existe pas
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log('✅ Config tickets sauvegardée localement');
  } catch (error) {
    console.error('❌ Erreur sauvegarde locale tickets:', error);
  }

  // Essayer aussi de sauvegarder sur le backend (optionnel)
  return new Promise((resolve) => {
    const https = require('https');
    const http = require('http');
    const BACKEND_URL = process.env.BACKEND_URL || 'https://bot-anbu.onrender.com';
    const url = `${BACKEND_URL}/internal/tickets`;
    const body = JSON.stringify(config);

    const urlObj = new URL(url);
    const client = url.startsWith('https') ? https : http;

    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (url.startsWith('https') ? 443 : 80),
        path: urlObj.pathname,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-internal-secret': process.env.INTERNAL_SECRET || 'lanbu-internal',
        },
        timeout: 5000,
      },
      (res: any) => {
        res.on('data', () => {});
        res.on('end', () => {
          console.log('✅ Config tickets sauvegardée sur le backend');
          resolve();
        });
      }
    );

    req.on('error', (err: any) => {
      console.warn('⚠️ Impossible de sauvegarder sur le backend:', err.message);
      resolve();
    });
    req.on('timeout', () => { 
      req.destroy(); 
      console.warn('⚠️ Timeout sauvegarde backend');
      resolve(); 
    });
    req.write(body);
    req.end();
  });
}

// ── Helper : fermeture de ticket ───────────────────────────────────────────
export async function handleCloseTicket(
  interaction: ChatInputCommandInteraction | any,
  raison: string,
  fromButton = false
) {
  const channel = interaction.channel as any;
  const guild = interaction.guild!;

  if (!channel?.name?.startsWith('ticket-')) {
    const reply = { content: '❌ Cette commande doit être utilisée dans un canal de ticket.', ephemeral: true };
    if (fromButton) await interaction.reply(reply);
    else await interaction.reply(reply);
    return;
  }

  if (!fromButton) await interaction.deferReply();

  // Générer le transcript HTML
  const messages = await channel.messages.fetch({ limit: 100 });
  const transcript = generateTranscript(channel.name, guild.name, messages);

  // Chercher le ticket dans la config
  const config = await fetchTicketConfig();
  const ticketEntry: TicketEntry | undefined = config.tickets?.find(
    (t: TicketEntry) => t.channelId === channel.id
  );

  // Notifier le créateur du ticket par MP
  if (ticketEntry) {
    try {
      const creator = await guild.members.fetch(ticketEntry.userId).catch(() => null);
      if (creator) {
        const dmEmbed = new EmbedBuilder()
          .setColor(Colors.Orange)
          .setTitle('🔒 Ton ticket a été fermé')
          .setDescription(
            `Ton ticket **${channel.name}** sur **${guild.name}** a été fermé.`
          )
          .addFields(
            { name: '📋 Raison', value: raison },
            { name: '👤 Fermé par', value: interaction.user.tag },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
            { name: '🏷️ Sujet', value: ticketEntry.subject || 'Non renseigné', inline: true },
            { name: '📂 Catégorie', value: ticketEntry.category || 'Non renseignée', inline: true }
          )
          .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined })
          .setTimestamp();

        await creator.send({ embeds: [dmEmbed] }).catch(() => {});
      }
    } catch {}

    // Mettre à jour le statut du ticket
    ticketEntry.status = 'closed';
    ticketEntry.closedAt = new Date().toISOString();
    ticketEntry.closedBy = interaction.user.tag;
    ticketEntry.closeReason = raison;
    config.closedTickets = (config.closedTickets || 0) + 1;
    config.openTickets = Math.max(0, (config.openTickets || 1) - 1);
    await saveTicketConfig(config);
  }

  // Envoyer dans le canal de logs
  if (config.logChannelId) {
    try {
      const logChannel = guild.channels.cache.get(config.logChannelId) as any;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(Colors.Red)
          .setTitle('🔒 Ticket fermé')
          .addFields(
            { name: '📌 Canal', value: `#${channel.name}`, inline: true },
            { name: '👤 Fermé par', value: interaction.user.tag, inline: true },
            { name: '📋 Raison', value: raison, inline: false },
            {
              name: '👥 Créateur',
              value: ticketEntry ? `<@${ticketEntry.userId}>` : 'Inconnu',
              inline: true,
            },
            {
              name: '📂 Catégorie',
              value: ticketEntry?.category || 'Non renseignée',
              inline: true,
            },
            {
              name: '⏱️ Ouvert le',
              value: ticketEntry
                ? `<t:${Math.floor(new Date(ticketEntry.createdAt).getTime() / 1000)}:R>`
                : 'Inconnu',
              inline: true,
            }
          )
          .setTimestamp();

        await logChannel.send({
          embeds: [logEmbed],
          files: [
            {
              attachment: Buffer.from(transcript, 'utf-8'),
              name: `transcript-${channel.name}.html`,
            },
          ],
        });
      }
    } catch {}
  }

  // Embed de fermeture dans le canal du ticket
  const closeEmbed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle('🔒 Ticket en cours de fermeture')
    .setDescription(
      `Ce ticket sera **supprimé dans 5 secondes**.\n\n` +
      `📋 **Raison :** ${raison}\n` +
      `👤 **Fermé par :** ${interaction.user}`
    )
    .setTimestamp();

  if (fromButton) {
    await interaction.reply({ embeds: [closeEmbed] });
  } else {
    await interaction.editReply({ embeds: [closeEmbed] });
  }

  // Supprimer le canal après 5 secondes
  setTimeout(async () => {
    await channel.delete(`Ticket fermé par ${interaction.user.tag} — ${raison}`).catch(() => {});
  }, 5000);
}

// ── Helper : générer transcript HTML ──────────────────────────────────────
function generateTranscript(channelName: string, guildName: string, messages: any): string {
  const msgs = [...messages.values()].reverse();
  const rows = msgs
    .map((m: any) => {
      const time = new Date(m.createdTimestamp).toLocaleString('fr-FR');
      const avatar = m.author.displayAvatarURL({ size: 32, extension: 'png' });
      const isBot = m.author.bot ? ' <span style="background:#5865F2;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:4px;">BOT</span>' : '';
      const embeds = m.embeds.map((e: any) => `
        <div style="border-left:4px solid ${e.color ? '#' + e.color.toString(16) : '#5865F2'};padding:8px 12px;margin:6px 0;background:#2b2d31;border-radius:4px;">
          ${e.title ? `<div style="font-weight:bold;margin-bottom:4px;">${e.title}</div>` : ''}
          ${e.description ? `<div style="font-size:13px;color:#dbdee1;">${e.description.replace(/\n/g, '<br>')}</div>` : ''}
        </div>`).join('');

      return `
        <div style="display:flex;align-items:flex-start;padding:8px 16px;gap:12px;border-bottom:1px solid #3f4248;">
          <img src="${avatar}" style="width:36px;height:36px;border-radius:50%;" />
          <div>
            <span style="font-weight:bold;color:#fff;">${m.author.username}</span>${isBot}
            <span style="font-size:11px;color:#6d6f78;margin-left:8px;">${time}</span>
            <div style="margin-top:2px;color:#dbdee1;font-size:14px;">${m.content || ''}</div>
            ${embeds}
          </div>
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Transcript — ${channelName}</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #313338; color: #dbdee1; }
    .header { background: #2b2d31; padding: 20px 24px; border-bottom: 2px solid #5865F2; display: flex; align-items: center; gap: 16px; }
    .header h1 { margin: 0; font-size: 18px; color: #fff; }
    .header span { color: #6d6f78; font-size: 13px; }
    .badge { background: #5865F2; color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
    .messages { max-width: 900px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🎫 ${channelName}</h1>
      <span>${guildName} • Transcript généré le ${new Date().toLocaleString('fr-FR')}</span>
    </div>
    <span class="badge">${msgs.length} messages</span>
  </div>
  <div class="messages">${rows}</div>
</body>
</html>`;
}

export default command;
