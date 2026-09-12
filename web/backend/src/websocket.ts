import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client, Events } from 'discord.js';
import { fetchLiveStreams, loadTwitchConfig, liveStatusCache, TwitchStream } from './routes/twitch';

export function setupWebSocket(server: HTTPServer, discordClient: Client) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const clients: Set<WebSocket> = new Set();

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 Nouveau client WebSocket connecté');
    clients.add(ws);

    ws.on('close', () => {
      console.log('🔌 Client WebSocket déconnecté');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ Erreur WebSocket:', error);
      clients.delete(ws);
    });

    // Envoyer le statut initial
    if (discordClient.isReady()) {
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          connected: true,
          guilds: discordClient.guilds.cache.size,
          users: discordClient.users.cache.size,
        },
      }));
    }
  });

  // Fonction pour diffuser un message à tous les clients
  const broadcast = (type: string, data: any) => {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Écouter les événements Discord et les diffuser
  discordClient.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;
    
    broadcast('message', {
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.displayAvatarURL(),
      },
      guild: message.guild ? {
        id: message.guild.id,
        name: message.guild.name,
      } : null,
      channel: {
        id: message.channel.id,
        name: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,
      },
    });
  });

  discordClient.on(Events.GuildMemberAdd, (member) => {
    broadcast('memberJoin', {
      userId: member.id,
      username: member.user.username,
      guildId: member.guild.id,
      guildName: member.guild.name,
    });
  });

  discordClient.on(Events.GuildMemberRemove, (member) => {
    broadcast('memberLeave', {
      userId: member.id,
      username: member.user.username,
      guildId: member.guild.id,
      guildName: member.guild.name,
    });
  });

  // Envoyer les stats toutes les 30 secondes
  setInterval(() => {
    if (discordClient.isReady()) {
      broadcast('stats', {
        guilds: discordClient.guilds.cache.size,
        users: discordClient.users.cache.size,
        channels: discordClient.channels.cache.size,
        uptime: process.uptime(),
        ping: discordClient.ws.ping,
      });
    }
  }, 30000);

  // ─── Polling Twitch live (60s) ────────────────────────────────────────────
  const twitchLiveSet = new Set<string>(); // logins actuellement en live

  const pollTwitch = async () => {
    const configured =
      process.env.TWITCH_CLIENT_ID &&
      process.env.TWITCH_CLIENT_ID !== 'your_twitch_client_id_here';
    if (!configured) return;

    try {
      const config = await loadTwitchConfig();
      if (!config.channels.length) return;

      const streams = await fetchLiveStreams(config.channels);
      const nowLive = new Set(streams.map((s: TwitchStream) => s.user_login.toLowerCase()));

      // Enrichir les thumbnails
      const enriched = streams.map((s: TwitchStream) => ({
        ...s,
        thumbnail_url: s.thumbnail_url
          .replace('{width}', '440')
          .replace('{height}', '248'),
      }));

      // Mettre à jour le cache partagé
      liveStatusCache.clear();
      enriched.forEach((s: TwitchStream) => liveStatusCache.set(s.user_login.toLowerCase(), s));

      // Nouveaux lives
      for (const stream of enriched) {
        const login = stream.user_login.toLowerCase();
        if (!twitchLiveSet.has(login)) {
          twitchLiveSet.add(login);
          broadcast('twitch:goLive', stream);
          console.log(`🔴 [WS] ${stream.user_name} est en live`);
        }
      }

      // Fins de live
      for (const login of twitchLiveSet) {
        if (!nowLive.has(login)) {
          twitchLiveSet.delete(login);
          broadcast('twitch:goOffline', { user_login: login });
          console.log(`⚫ [WS] ${login} n'est plus en live`);
        }
      }

      // Snapshot complet toutes les 60s (pour la page Live)
      broadcast('twitch:streams', {
        streams: enriched,
        total: enriched.length,
        liveLogins: Array.from(nowLive),
      });
    } catch (err) {
      // Silencieux — pas de spam en cas d'erreur réseau
    }
  };

  // Première vérification au démarrage, puis toutes les 60s
  setTimeout(pollTwitch, 5000);
  setInterval(pollTwitch, 60_000);

  console.log('✅ WebSocket configuré sur /ws');
}
