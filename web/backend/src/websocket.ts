import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client, Events } from 'discord.js';

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

  console.log('✅ WebSocket configuré sur /ws');
}
