import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitchConfig {
  channels: string[];       // noms de streamers (lowercase)
  notifyChannelId: string;  // canal Discord où pinguer
  roleId?: string;          // rôle à mentionner (optionnel)
}

interface TwitchStream {
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  description: string;
}

// ─── Persistance ──────────────────────────────────────────────────────────────

const CONFIG_FILE = path.join(process.cwd(), 'data', 'twitch-config.json');

async function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  try { await fs.access(dir); } catch { await fs.mkdir(dir, { recursive: true }); }
}

export async function loadTwitchConfig(): Promise<TwitchConfig> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { channels: [], notifyChannelId: '' };
  }
}

export async function saveTwitchConfig(config: TwitchConfig): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ─── Twitch API ───────────────────────────────────────────────────────────────

let accessToken: string | null = null;
let tokenExpiry = 0;

async function httpRequest(options: https.RequestOptions, postData?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Réponse non-JSON: ' + data)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function getTwitchToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquant dans .env');
  }

  const postData = `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;

  const data = await httpRequest({
    hostname: 'id.twitch.tv',
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, postData);

  if (!data.access_token) throw new Error('Impossible d\'obtenir un token Twitch');

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  console.log('✅ Token Twitch obtenu');
  return accessToken!;
}

async function fetchLiveStreams(userLogins: string[]): Promise<TwitchStream[]> {
  if (userLogins.length === 0) return [];

  const token = await getTwitchToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const query = userLogins.map(u => `user_login=${encodeURIComponent(u)}`).join('&');

  const data = await httpRequest({
    hostname: 'api.twitch.tv',
    path: `/helix/streams?${query}`,
    method: 'GET',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
    },
  });

  return data.data || [];
}

// Cache des photos de profil pour éviter trop de requêtes
const profileCache = new Map<string, string>();

async function fetchUserProfiles(userLogins: string[]): Promise<Map<string, TwitchUser>> {
  if (userLogins.length === 0) return new Map();

  const token = await getTwitchToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const query = userLogins.map(u => `login=${encodeURIComponent(u)}`).join('&');

  const data = await httpRequest({
    hostname: 'api.twitch.tv',
    path: `/helix/users?${query}`,
    method: 'GET',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${token}`,
    },
  });

  const map = new Map<string, TwitchUser>();
  for (const user of (data.data || [])) {
    map.set(user.login.toLowerCase(), user);
    profileCache.set(user.login.toLowerCase(), user.profile_image_url);
  }
  return map;
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

// Garde en mémoire les streamers actuellement en live pour éviter les doublons
const currentlyLive = new Set<string>();
let monitorInterval: NodeJS.Timeout | null = null;

function buildLiveEmbed(stream: TwitchStream, avatarUrl?: string): EmbedBuilder {
  const thumbnail = stream.thumbnail_url
    .replace('{width}', '1280')
    .replace('{height}', '720');

  // Ajouter un timestamp pour éviter le cache Discord sur la miniature
  const thumbnailNocache = `${thumbnail}?t=${Date.now()}`;

  return new EmbedBuilder()
    .setColor(0x9146FF)
    .setAuthor({
      name: `${stream.user_name} est en live !`,
      iconURL: avatarUrl || 'https://brand.twitch.tv/assets/images/black.png',
      url: `https://twitch.tv/${stream.user_login}`,
    })
    .setTitle(stream.title || 'Sans titre')
    .setURL(`https://twitch.tv/${stream.user_login}`)
    .addFields(
      { name: '🎮 Jeu', value: stream.game_name || 'Non renseigné', inline: true },
      { name: '👀 Viewers', value: stream.viewer_count.toLocaleString('fr-FR'), inline: true },
      { name: '🔗 Lien', value: `[Regarder le live](https://twitch.tv/${stream.user_login})`, inline: true },
    )
    .setImage(thumbnailNocache)
    .setThumbnail(avatarUrl || null)
    .setFooter({ text: `twitch.tv/${stream.user_login} • Live depuis` })
    .setTimestamp(new Date(stream.started_at));
}

async function checkStreams(discordClient: Client): Promise<void> {
  const config = await loadTwitchConfig();
  if (!config.channels.length || !config.notifyChannelId) return;

  try {
    const liveStreams = await fetchLiveStreams(config.channels);
    const liveLogins = new Set(liveStreams.map(s => s.user_login.toLowerCase()));

    // Récupérer les profils des streamers en live (PP)
    const newStreamers = liveStreams.filter(s => !currentlyLive.has(s.user_login.toLowerCase()));
    let profiles = new Map<string, TwitchUser>();
    if (newStreamers.length > 0) {
      profiles = await fetchUserProfiles(newStreamers.map(s => s.user_login));
    }

    // Streamers qui viennent de commencer
    for (const stream of liveStreams) {
      const login = stream.user_login.toLowerCase();
      if (!currentlyLive.has(login)) {
        currentlyLive.add(login);
        console.log(`🎮 ${stream.user_name} est en live !`);

        try {
          const channel = await discordClient.channels.fetch(config.notifyChannelId) as TextChannel;
          if (!channel?.isTextBased()) continue;

          // Récupérer la PP depuis le cache ou le fetch
          const avatarUrl = profiles.get(login)?.profile_image_url
            || profileCache.get(login)
            || undefined;

          const mention = config.roleId ? `<@&${config.roleId}>` : '';

          // 1er message : embed seul (le ping dans le même message ne notifie pas les membres)
          await channel.send({
            embeds: [buildLiveEmbed(stream, avatarUrl)],
          });

          // 2ème message : ping séparé pour déclencher la vraie notification Discord
          if (mention) {
            await channel.send({ content: mention });
          }
        } catch (err) {
          console.error(`❌ Erreur envoi notif Twitch pour ${stream.user_name}:`, err);
        }
      }
    }

    // Retirer les streamers qui ne sont plus en live
    for (const login of currentlyLive) {
      if (!liveLogins.has(login)) {
        currentlyLive.delete(login);
        console.log(`⏹️ ${login} n'est plus en live`);
      }
    }
  } catch (err) {
    console.error('❌ Erreur vérification Twitch:', err);
  }
}

// ─── Démarrage / arrêt ────────────────────────────────────────────────────────

export function startTwitchMonitor(discordClient: Client, intervalMs = 60_000): void {
  if (monitorInterval) return; // Déjà démarré

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret ||
      clientId === 'ton_twitch_client_id' ||
      clientSecret === 'ton_twitch_client_secret') {
    console.warn('⚠️ Twitch Monitor désactivé : TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET non configurés');
    return;
  }

  console.log(`✅ Twitch Monitor démarré (vérification toutes les ${intervalMs / 1000}s)`);

  // Première vérification immédiate
  checkStreams(discordClient);
  monitorInterval = setInterval(() => checkStreams(discordClient), intervalMs);
}

export function stopTwitchMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('⏹️ Twitch Monitor arrêté');
  }
}
