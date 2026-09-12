import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits,
  Colors,
  OverwriteType,
} from 'discord.js';
import { config, isDeveloper } from './config';
import { Command } from './types';
import { loadCommands } from './handlers/commandHandler';
import { startTwitchMonitor, stopTwitchMonitor } from './services/twitchMonitor';
import {
  fetchTicketConfig,
  saveTicketConfig,
  handleCloseTicket,
  defaultTicketConfig,
  type TicketEntry,
} from './commands/admin/ticket';
import https from 'https';
import http from 'http';

// Extension du type Client pour inclure la collection de commandes
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

// URL de l'API backend (même service sur Render, ou localhost en dev)
const BACKEND_URL = process.env.BACKEND_URL || 'https://bot-anbu.onrender.com';

// Cache des automatisations
let automationsCache: any = null;
let lastAutomationsFetch = 0;
const CACHE_TTL = 30000; // 30 secondes

// Cache XP pour le level system (userId -> { xp, level, lastMessage })
const userXP = new Map<string, { xp: number; level: number; lastMessage: number }>();

// Récupérer les automatisations depuis l'API backend
async function fetchAutomations(): Promise<any> {
  const now = Date.now();
  if (now - lastAutomationsFetch < CACHE_TTL && automationsCache && lastAutomationsFetch > 0) {
    return automationsCache;
  }

  return new Promise((resolve) => {
    const url = `${BACKEND_URL}/internal/automations`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          automationsCache = JSON.parse(data);
          lastAutomationsFetch = Date.now();
          console.log('✅ Automatisations récupérées depuis le backend');
          resolve(automationsCache);
        } catch {
          resolve(automationsCache || {});
        }
      });
    });

    req.on('error', () => resolve(automationsCache || {}));
    req.on('timeout', () => { req.destroy(); resolve(automationsCache || {}); });
  });
}

// Création du client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialisation de la collection de commandes
client.commands = new Collection();

// Événement: Bot prêt
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot connecté en tant que ${c.user.tag}`);
  console.log(`📊 Serveurs: ${c.guilds.cache.size}`);
  console.log(`👥 Utilisateurs: ${c.users.cache.size}`);
  console.log(`🔧 ${config.devIds.length} développeur(s) autorisé(s)`);
  
  // Définir le statut du bot
  c.user.setPresence({
    activities: [{ name: 'les commandes slash / | Bot Communautaire' }],
    status: 'online',
  });
  
  // Précharger les automatisations au démarrage
  fetchAutomations().then(() => {
    console.log('🔄 Automatisations chargées');
  }).catch(() => {
    console.error('⚠️ Impossible de charger les automatisations au démarrage');
  });

  // Démarrer le monitoring Twitch (vérification toutes les 60s)
  startTwitchMonitor(c, 60_000);
});

// Événement: Nouveau membre (welcome + autorole)
client.on(Events.GuildMemberAdd, async (member) => {
  // Forcer rechargement des automatisations (ignorer le cache)
  lastAutomationsFetch = 0;
  
  try {
    const automations = await fetchAutomations();
    console.log(`👤 Nouveau membre: ${member.user.tag} - Automatisations:`, JSON.stringify({
      welcome: automations.welcome?.enabled,
      autorole: automations.autorole?.enabled,
    }));

    // Autorole
    if (automations.autorole?.enabled && automations.autorole.roleId) {
      try {
        // Fetch les rôles si pas en cache
        await member.guild.roles.fetch();
        const role = member.guild.roles.cache.get(automations.autorole.roleId);
        if (role) {
          await member.roles.add(role);
          console.log(`✅ Rôle automatique "${role.name}" attribué à ${member.user.tag}`);
        } else {
          console.error(`❌ Rôle introuvable: ${automations.autorole.roleId}`);
        }
      } catch (error) {
        console.error('❌ Erreur autorole:', error);
      }
    }

    // Message de bienvenue
    if (automations.welcome?.enabled && automations.welcome.channelId) {
      try {
        const channel = await member.guild.channels.fetch(automations.welcome.channelId);
        if (channel?.isTextBased()) {
          const message = automations.welcome.message
            .replace(/\{user\}/g, `<@${member.id}>`)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{count\}/g, member.guild.memberCount.toString());

          if (automations.welcome.embedEnabled) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
              .setTitle(automations.welcome.embedTitle || 'Bienvenue !')
              .setDescription(message)
              .setColor((automations.welcome.embedColor || '#5865F2') as any)
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            await (channel as any).send({ embeds: [embed] });
          } else {
            await (channel as any).send(message);
          }
          console.log(`✅ Message de bienvenue envoyé pour ${member.user.tag}`);
        }
      } catch (error) {
        console.error('❌ Erreur welcome:', error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur gestion nouveau membre:', error);
  }
});

// Événement: Membre parti (goodbye)
client.on(Events.GuildMemberRemove, async (member) => {
  // Forcer rechargement
  lastAutomationsFetch = 0;

  try {
    const automations = await fetchAutomations();
    
    if (automations.goodbye?.enabled && automations.goodbye.channelId) {
      try {
        const channel = await member.guild.channels.fetch(automations.goodbye.channelId);
        if (channel?.isTextBased()) {
          const message = automations.goodbye.message
            .replace(/\{user\}/g, member.user.tag)
            .replace(/\{server\}/g, member.guild.name)
            .replace(/\{count\}/g, member.guild.memberCount.toString());

          await (channel as any).send(message);
          console.log(`✅ Message de départ envoyé pour ${member.user.tag}`);
        }
      } catch (error) {
        console.error('❌ Erreur goodbye:', error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur gestion départ membre:', error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  SYSTÈME DE TICKETS — helpers internes
// ═══════════════════════════════════════════════════════════════════════════

/** Vérifie combien de tickets ouverts un user a déjà dans le guild */
async function countUserOpenTickets(guild: any, userId: string): Promise<number> {
  return guild.channels.cache.filter(
    (c: any) =>
      c.type === ChannelType.GuildText &&
      c.name.startsWith('ticket-') &&
      c.permissionOverwrites.cache.has(userId)
  ).size;
}

/** Ouvre un nouveau ticket pour un utilisateur */
async function openTicket(
  guild: any,
  user: any,
  category: string,
  subject: string,
  ticketConfig: any
) {
  const ticketName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // Résoudre la catégorie Discord
  let parentId: string | undefined;
  if (ticketConfig.categoryId) {
    const cat = guild.channels.cache.get(ticketConfig.categoryId);
    if (cat?.type === ChannelType.GuildCategory) parentId = cat.id;
  }

  // Préparer les overwrites de permissions
  const permissionOverwrites: any[] = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // @everyone
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: guild.members.me!.id, // Bot lui-même
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  // Ajouter le rôle support si configuré
  if (ticketConfig.supportRoleId) {
    const supportRole = guild.roles.cache.get(ticketConfig.supportRoleId);
    if (supportRole) {
      permissionOverwrites.push({
        id: ticketConfig.supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }
  }

  const channel = await guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    parent: parentId,
    topic: `🎫 Ticket de ${user.tag} | Catégorie : ${category} | Sujet : ${subject}`,
    permissionOverwrites,
  });

  // ── Embed principal dans le canal du ticket ─────────────────────────────
  const categoryEmojis: Record<string, string> = {
    bug: '🐛',
    suggestion: '💡',
    partenariat: '🤝',
    autre: '❓',
  };
  const emoji = categoryEmojis[category.toLowerCase()] || '🎫';

  const ticketEmbed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`${emoji} Ticket — ${category}`)
    .setDescription(
      `Bienvenue <@${user.id}> !\n\n` +
      `Notre équipe de support va prendre en charge ta demande rapidement.\n\n` +
      `**📋 Récapitulatif de ta demande**\n` +
      `> **Catégorie :** ${category}\n` +
      `> **Sujet :** ${subject}\n\n` +
      `*Décris ton problème en détail ci-dessous. Plus tu es précis, mieux on peut t\'aider.*`
    )
    .addFields(
      { name: '👤 Créateur', value: `<@${user.id}>`, inline: true },
      { name: '📅 Ouvert le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      {
        name: '👷 Support',
        value: ticketConfig.supportRoleId ? `<@&${ticketConfig.supportRoleId}>` : 'Équipe support',
        inline: true,
      }
    )
    .setFooter({ text: `${guild.name} • Ticket System`, iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close_btn')
      .setLabel('🔒 Fermer le ticket')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel('✋ Prendre en charge')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket:transcript')
      .setLabel('📄 Transcript')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: `<@${user.id}>${ticketConfig.supportRoleId ? ` | <@&${ticketConfig.supportRoleId}>` : ''}`,
    embeds: [ticketEmbed],
    components: [controlRow],
  });

  // ── Sauvegarder le ticket dans la config ────────────────────────────────
  const newEntry: TicketEntry = {
    id: `TKT-${Date.now()}`,
    channelId: channel.id,
    userId: user.id,
    userTag: user.tag,
    category,
    subject,
    createdAt: new Date().toISOString(),
    status: 'open',
  };

  ticketConfig.tickets = ticketConfig.tickets || [];
  ticketConfig.tickets.push(newEntry);
  ticketConfig.openTickets = (ticketConfig.openTickets || 0) + 1;
  await saveTicketConfig(ticketConfig);

  // ── Log d'ouverture ─────────────────────────────────────────────────────
  if (ticketConfig.logChannelId) {
    try {
      const logChannel = guild.channels.cache.get(ticketConfig.logChannelId) as any;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle('🎫 Nouveau ticket ouvert')
          .addFields(
            { name: '👤 Créateur', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: '📌 Canal', value: `<#${channel.id}>`, inline: true },
            { name: '📂 Catégorie', value: category, inline: true },
            { name: '🏷️ Sujet', value: subject, inline: false },
            { name: '🆔 Ticket ID', value: newEntry.id, inline: true }
          )
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch {}
  }

  // ── DM de confirmation ──────────────────────────────────────────────────
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('✅ Ticket ouvert avec succès')
      .setDescription(
        `Ton ticket a été créé sur **${guild.name}** !\n\n` +
        `📌 Canal : <#${channel.id}>\n` +
        `📂 Catégorie : **${category}**\n` +
        `🏷️ Sujet : **${subject}**\n\n` +
        `Notre équipe de support te répondra dans les plus brefs délais.`
      )
      .setFooter({ text: `ID : ${newEntry.id}` })
      .setTimestamp();

    await user.send({ embeds: [dmEmbed] }).catch(() => {});
  } catch {}

  return channel;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ÉVÉNEMENT : INTERACTION (commandes slash + boutons + modals + menus)
// ═══════════════════════════════════════════════════════════════════════════

// Événement: Interaction créée (commandes slash)
client.on(Events.InteractionCreate, async (interaction) => {
  // ── 1. Slash commands ──────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`❌ Commande inconnue: ${interaction.commandName}`);
      return;
    }

    if (command.devOnly && !isDeveloper(interaction.user.id)) {
      await interaction.reply({
        content: '❌ Cette commande est réservée aux développeurs du bot.',
        ephemeral: true,
      });
      return;
    }

    try {
      console.log(
        `📝 ${interaction.user.tag} a exécuté /${interaction.commandName} dans ${interaction.guild?.name || 'DM'}`
      );
      await command.execute(interaction);
    } catch (error) {
      console.error('❌ Erreur lors de l\'exécution de la commande:', error);
      const errorMessage = {
        content: '❌ Une erreur s\'est produite lors de l\'exécution de cette commande.',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
    return;
  }

  // ── 2. Boutons de tickets ──────────────────────────────────────────────
  if (interaction.isButton()) {
    const { customId, guild, user } = interaction;
    if (!guild) return;

    // ── 2a. Ouvrir un ticket (bouton dans le panneau) ────────────────────
    if (customId === 'ticket:open') {
      const ticketConfig = await fetchTicketConfig();

      if (!ticketConfig.enabled) {
        await interaction.reply({
          content: '❌ Le système de tickets est actuellement désactivé.',
          ephemeral: true,
        });
        return;
      }

      // Vérifier la limite de tickets par user
      const openCount = await countUserOpenTickets(guild, user.id);
      if (openCount >= (ticketConfig.maxPerUser || 1)) {
        await interaction.reply({
          content: `❌ Tu as déjà **${openCount}** ticket(s) ouvert(s). Merci de patienter ou de fermer un ticket existant.`,
          ephemeral: true,
        });
        return;
      }

      // Afficher la modal de création
      const modal = new ModalBuilder()
        .setCustomId('ticket:create_modal')
        .setTitle('📩 Créer un ticket');

      const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('Décris ton problème ou ta demande')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex : J\'ai un problème avec... / Je voudrais suggérer...')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput));

      await interaction.showModal(modal);
      return;
    }

    // ── 2b. Mes tickets (bouton dans le panneau) ─────────────────────────
    if (customId === 'ticket:my_tickets') {
      const myTickets = guild.channels.cache.filter(
        (c: any) =>
          c.type === ChannelType.GuildText &&
          c.name.startsWith('ticket-') &&
          c.permissionOverwrites.cache.has(user.id)
      );

      if (myTickets.size === 0) {
        await interaction.reply({
          content: '📭 Tu n\'as aucun ticket ouvert en ce moment.',
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`📋 Tes tickets ouverts (${myTickets.size})`)
        .setDescription(myTickets.map((c: any) => `<#${c.id}>`).join('\n'));

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ── 2c. Fermer via bouton dans le canal ──────────────────────────────
    if (customId === 'ticket:close_btn') {
      // Afficher une modal pour demander la raison
      const modal = new ModalBuilder()
        .setCustomId('ticket:close_modal')
        .setTitle('🔒 Fermer le ticket');

      const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Raison de la fermeture (optionnel)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex : Problème résolu, Demande traitée...')
        .setRequired(false)
        .setMaxLength(200);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));

      await interaction.showModal(modal);
      return;
    }

    // ── 2d. Prendre en charge le ticket ──────────────────────────────────
    if (customId === 'ticket:claim') {
      const channel = interaction.channel as any;
      if (!channel?.name?.startsWith('ticket-')) return;

      const claimEmbed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(
          `✋ **${user.tag}** a pris en charge ce ticket.\n` +
          `> <t:${Math.floor(Date.now() / 1000)}:R>`
        );

      // Modifier le topic du canal
      await channel.setTopic(
        `${channel.topic || ''} | 👷 Pris en charge par : ${user.tag}`
      ).catch(() => {});

      await interaction.reply({ embeds: [claimEmbed] });
      return;
    }

    // ── 2e. Générer un transcript ─────────────────────────────────────────
    if (customId === 'ticket:transcript') {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.channel as any;

      if (!channel?.name?.startsWith('ticket-')) {
        await interaction.editReply({ content: '❌ Ce n\'est pas un canal de ticket.' });
        return;
      }

      const messages = await channel.messages.fetch({ limit: 100 });
      // Importer la fonction generateTranscript depuis la commande
      const { default: ticketCmd } = await import('./commands/admin/ticket');
      // On génère via la route interne — ici on construit le transcript manuellement
      const msgs = [...messages.values()].reverse() as any[];
      const rows = msgs.map((m: any) => {
        const time = new Date(m.createdTimestamp).toLocaleString('fr-FR');
        return `[${time}] ${m.author.username}: ${m.content || '(embed)'}`;
      }).join('\n');

      const transcriptBuffer = Buffer.from(
        `TRANSCRIPT — ${channel.name}\nGénéré le ${new Date().toLocaleString('fr-FR')}\n${'─'.repeat(60)}\n${rows}`,
        'utf-8'
      );

      await interaction.editReply({
        content: '📄 Transcript généré !',
        files: [{ attachment: transcriptBuffer, name: `transcript-${channel.name}.txt` }],
      });
      return;
    }

    // ── 2f. Confirmer fermeture ───────────────────────────────────────────
    if (customId === 'ticket:confirm_close') {
      await handleCloseTicket(interaction as any, 'Ticket fermé manuellement', true);
      return;
    }
  }

  // ── 3. Modals de tickets ───────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    const { customId, guild, user } = interaction;
    if (!guild) return;

    // ── 3a. Modal création de ticket (choix catégorie après) ─────────────
    if (customId === 'ticket:create_modal') {
      const subject = interaction.fields.getTextInputValue('ticket_subject');

      // Afficher le sélecteur de catégorie
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket:select_category:${encodeURIComponent(subject)}`)
        .setPlaceholder('📂 Choisir une catégorie...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Bug')
            .setDescription('Signaler un problème technique')
            .setValue('Bug')
            .setEmoji('🐛'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Suggestion')
            .setDescription('Proposer une idée ou amélioration')
            .setValue('Suggestion')
            .setEmoji('💡'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Partenariat')
            .setDescription('Demande de partenariat')
            .setValue('Partenariat')
            .setEmoji('🤝'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Autre')
            .setDescription('Toute autre question')
            .setValue('Autre')
            .setEmoji('❓')
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.reply({
        content: '📂 **Dernière étape !** Sélectionne la catégorie de ton ticket :',
        components: [row],
        ephemeral: true,
      });
      return;
    }

    // ── 3b. Modal fermeture de ticket ────────────────────────────────────
    if (customId === 'ticket:close_modal') {
      const reason =
        interaction.fields.getTextInputValue('close_reason') || 'Aucune raison fournie';
      await handleCloseTicket(interaction as any, reason, true);
      return;
    }

    // ── 3c. Modal config — options texte ─────────────────────────────────
    if (customId.startsWith('ticket:config_modal:')) {
      const field = customId.replace('ticket:config_modal:', '');
      const value = interaction.fields.getTextInputValue('config_value');
      const ticketConfig = await fetchTicketConfig();

      if (field === 'embed_title') ticketConfig.embedTitle = value;
      if (field === 'embed_description') ticketConfig.embedDescription = value;
      if (field === 'embed_color') ticketConfig.embedColor = value;
      if (field === 'max_tickets') ticketConfig.maxPerUser = parseInt(value) || 1;

      await saveTicketConfig(ticketConfig);

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setDescription(`✅ **${field.replace('_', ' ')}** mis à jour avec succès !`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }

  // ── 4. Menus déroulants de tickets ─────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    const { customId, guild, user } = interaction;
    if (!guild) return;

    // ── 4a. Sélection catégorie → ouvrir ticket ───────────────────────────
    if (customId.startsWith('ticket:select_category:')) {
      const encodedSubject = customId.replace('ticket:select_category:', '');
      const subject = decodeURIComponent(encodedSubject);
      const category = interaction.values[0];

      await interaction.deferReply({ ephemeral: true });

      const ticketConfig = await fetchTicketConfig();

      // Re-vérifier la limite (la modal prend du temps)
      const openCount = await countUserOpenTickets(guild, user.id);
      if (openCount >= (ticketConfig.maxPerUser || 1)) {
        await interaction.editReply({
          content: `❌ Tu as déjà **${openCount}** ticket(s) ouvert(s). Merci de fermer un ticket existant avant d\'en créer un nouveau.`,
        });
        return;
      }

      try {
        const channel = await openTicket(guild, user, category, subject, ticketConfig);
        await interaction.editReply({
          content: `✅ Ton ticket a été créé : <#${channel.id}>`,
        });
      } catch (error) {
        console.error('❌ Erreur création ticket:', error);
        await interaction.editReply({
          content: '❌ Une erreur s\'est produite lors de la création du ticket. Vérifiez la configuration (catégorie, permissions du bot).',
        });
      }
      return;
    }

    // ── 4b. Menu de configuration ─────────────────────────────────────────
    if (customId === 'ticket:config_select') {
      const selected = interaction.values[0];
      const ticketConfig = await fetchTicketConfig();

      // Options nécessitant un canal ou un rôle → afficher un menu secondaire
      if (selected === 'config:log_channel') {
        const channelOptions = guild.channels.cache
          .filter((c: any) => c.type === ChannelType.GuildText)
          .map((c: any) => new StringSelectMenuOptionBuilder()
            .setLabel(`#${c.name}`)
            .setValue(c.id)
            .setDescription(c.topic?.slice(0, 50) || 'Canal textuel')
          )
          .slice(0, 25);

        if (channelOptions.length === 0) {
          await interaction.reply({ content: '❌ Aucun canal textuel trouvé.', ephemeral: true });
          return;
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket:set_log_channel')
          .setPlaceholder('📬 Choisir le canal de logs...')
          .addOptions(channelOptions);

        await interaction.reply({
          content: '📬 Sélectionne le canal où les logs des tickets seront envoyés :',
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
          ephemeral: true,
        });
        return;
      }

      if (selected === 'config:category') {
        const catOptions = guild.channels.cache
          .filter((c: any) => c.type === ChannelType.GuildCategory)
          .map((c: any) => new StringSelectMenuOptionBuilder()
            .setLabel(c.name)
            .setValue(c.id)
          )
          .slice(0, 25);

        if (catOptions.length === 0) {
          await interaction.reply({
            content: '❌ Aucune catégorie trouvée. Crée une catégorie Discord pour y ranger les tickets.',
            ephemeral: true,
          });
          return;
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket:set_category')
          .setPlaceholder('📁 Choisir la catégorie des tickets...')
          .addOptions(catOptions);

        await interaction.reply({
          content: '📁 Sélectionne la catégorie Discord où les canaux de tickets seront créés :',
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
          ephemeral: true,
        });
        return;
      }

      if (selected === 'config:support_role') {
        const roleOptions = guild.roles.cache
          .filter((r: any) => !r.managed && r.name !== '@everyone')
          .sort((a: any, b: any) => b.position - a.position)
          .map((r: any) => new StringSelectMenuOptionBuilder()
            .setLabel(`@${r.name}`)
            .setValue(r.id)
          )
          .slice(0, 25);

        if (roleOptions.length === 0) {
          await interaction.reply({ content: '❌ Aucun rôle trouvé.', ephemeral: true });
          return;
        }

        const menu = new StringSelectMenuBuilder()
          .setCustomId('ticket:set_support_role')
          .setPlaceholder('👷 Choisir le rôle support...')
          .addOptions(roleOptions);

        await interaction.reply({
          content: '👷 Sélectionne le rôle qui aura accès à tous les tickets :',
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
          ephemeral: true,
        });
        return;
      }

      // Options nécessitant une modal de texte
      if (selected === 'config:embed_message') {
        const modal = new ModalBuilder()
          .setCustomId('ticket:config_modal:embed_title')
          .setTitle('✏️ Message du panneau');

        const titleInput = new TextInputBuilder()
          .setCustomId('config_value')
          .setLabel('Titre de l\'embed')
          .setStyle(TextInputStyle.Short)
          .setValue(ticketConfig.embedTitle || '🎫 Support & Tickets')
          .setRequired(true)
          .setMaxLength(100);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput));
        await interaction.showModal(modal);
        return;
      }

      if (selected === 'config:embed_color') {
        const modal = new ModalBuilder()
          .setCustomId('ticket:config_modal:embed_color')
          .setTitle('🎨 Couleur de l\'embed');

        const colorInput = new TextInputBuilder()
          .setCustomId('config_value')
          .setLabel('Code couleur HEX (ex: #5865F2)')
          .setStyle(TextInputStyle.Short)
          .setValue(ticketConfig.embedColor || '#5865F2')
          .setRequired(true)
          .setMaxLength(7);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput));
        await interaction.showModal(modal);
        return;
      }

      if (selected === 'config:max_tickets') {
        const modal = new ModalBuilder()
          .setCustomId('ticket:config_modal:max_tickets')
          .setTitle('🔢 Maximum de tickets par utilisateur');

        const maxInput = new TextInputBuilder()
          .setCustomId('config_value')
          .setLabel('Nombre maximum (1-5)')
          .setStyle(TextInputStyle.Short)
          .setValue(String(ticketConfig.maxPerUser || 1))
          .setRequired(true)
          .setMaxLength(1);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(maxInput));
        await interaction.showModal(modal);
        return;
      }
    }

    // ── 4c. Setters canal / catégorie / rôle ──────────────────────────────
    if (customId === 'ticket:set_log_channel') {
      const channelId = interaction.values[0];
      const ticketConfig = await fetchTicketConfig();
      ticketConfig.logChannelId = channelId;
      await saveTicketConfig(ticketConfig);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(Colors.Green)
          .setDescription(`✅ Canal de logs défini sur <#${channelId}>`)],
        ephemeral: true,
      });
      return;
    }

    if (customId === 'ticket:set_category') {
      const categoryId = interaction.values[0];
      const ticketConfig = await fetchTicketConfig();
      ticketConfig.categoryId = categoryId;
      await saveTicketConfig(ticketConfig);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(Colors.Green)
          .setDescription(`✅ Catégorie des tickets définie sur <#${categoryId}>`)],
        ephemeral: true,
      });
      return;
    }

    if (customId === 'ticket:set_support_role') {
      const roleId = interaction.values[0];
      const ticketConfig = await fetchTicketConfig();
      ticketConfig.supportRoleId = roleId;
      // Activer automatiquement le système si un rôle est défini
      ticketConfig.enabled = true;
      await saveTicketConfig(ticketConfig);

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(Colors.Green)
          .setDescription(
            `✅ Rôle support défini sur <@&${roleId}>\n✅ Système de tickets **activé** automatiquement !`
          )],
        ephemeral: true,
      });
      return;
    }
  }
});

// Événement: Message créé (automod + level system)
client.on(Events.MessageCreate, async (message) => {
  // Ignorer les bots
  if (message.author.bot) return;

  try {
    const automations = await fetchAutomations();

    // ===== AUTOMOD =====
    if (automations.automod?.enabled && message.guild) {
      let shouldDelete = false;
      let reason = '';

      // Anti-liens
      if (automations.automod.antiLinks) {
        const linkRegex = /(https?:\/\/[^\s]+)/gi;
        if (linkRegex.test(message.content)) {
          shouldDelete = true;
          reason = 'Lien interdit';
        }
      }

      // Anti-caps
      if (automations.automod.antiCaps && message.content.length > 10) {
        const capsCount = (message.content.match(/[A-Z]/g) || []).length;
        const capsPercent = (capsCount / message.content.length) * 100;
        if (capsPercent > (automations.automod.capsThreshold || 70)) {
          shouldDelete = true;
          reason = 'Trop de majuscules';
        }
      }

      // Supprimer le message et logger
      if (shouldDelete) {
        try {
          await message.delete();
          console.log(`🛡️ Message supprimé de ${message.author.tag}: ${reason}`);
          
          // Logger dans le canal de logs si configuré
          if (automations.automod.logChannelId) {
            const logChannel = await message.guild.channels.fetch(automations.automod.logChannelId);
            if (logChannel?.isTextBased()) {
              await (logChannel as any).send(
                `🛡️ **Automod**: Message de ${message.author.tag} supprimé\n**Raison**: ${reason}\n**Contenu**: ${message.content.slice(0, 100)}`
              );
            }
          }
        } catch (error) {
          console.error('❌ Erreur automod:', error);
        }
        return;
      }
    }

    // ===== LEVEL SYSTEM =====
    if (automations.levelSystem?.enabled && message.guild) {
      const userId = message.author.id;
      const now = Date.now();
      const userData = userXP.get(userId) || { xp: 0, level: 1, lastMessage: 0 };
      
      // Cooldown XP
      const cooldown = (automations.levelSystem.xpCooldown || 60) * 1000;
      if (now - userData.lastMessage >= cooldown) {
        userData.xp += automations.levelSystem.xpPerMessage || 15;
        userData.lastMessage = now;

        // Calcul du niveau (100 XP par niveau par exemple)
        const newLevel = Math.floor(userData.xp / 100) + 1;
        
        if (newLevel > userData.level) {
          userData.level = newLevel;
          userXP.set(userId, userData);

          // Message de level up
          if (automations.levelSystem.channelId) {
            try {
              const levelChannel = await message.guild.channels.fetch(automations.levelSystem.channelId);
              if (levelChannel?.isTextBased()) {
                const levelMsg = automations.levelSystem.message
                  .replace(/\{user\}/g, `<@${userId}>`)
                  .replace(/\{level\}/g, newLevel.toString());
                await (levelChannel as any).send(levelMsg);
              }
            } catch (error) {
              console.error('❌ Erreur level up:', error);
            }
          }
        } else {
          userXP.set(userId, userData);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur automatisations:', error);
  }
});

// Événement: Erreur
client.on(Events.Error, (error) => {
  console.error('❌ Erreur Discord.js:', error);
});

// Événement: Avertissement
client.on(Events.Warn, (warning) => {
  console.warn('⚠️ Avertissement Discord.js:', warning);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Promesse non gérée:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  stopTwitchMonitor();
  process.exit(1);
});

// Chargement des commandes et connexion du bot
async function main() {
  try {
    console.log('🔄 Chargement des commandes...');
    await loadCommands(client);
    console.log(`✅ ${client.commands.size} commande(s) chargée(s)`);

    console.log('🔄 Connexion au bot Discord...');
    await client.login(config.token);
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du bot:', error);
    process.exit(1);
  }
}

main();
