import { Router } from 'express';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { isAdmin } from '../server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TwitchStream {
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
  profile_image_url?: string;
}

export interface TwitchConfig {
  channels: string[];
  notifyChannelId: string;
  roleId?: string;
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

function httpRequest(options: https.RequestOptions, postData?: string): Promise<any> {
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

export async function getTwitchToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquant');
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
  return accessToken!;
}

export async function fetchLiveStreams(userLogins: string[]): Promise<TwitchStream[]> {
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

async function fetchUserProfiles(userLogins: string[]): Promise<Map<string, string>> {
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

  const map = new Map<string, string>();
  for (const user of (data.data || [])) {
    map.set(user.login.toLowerCase(), user.profile_image_url);
  }
  return map;
}

// ─── Cache statut live (pour le WebSocket) ───────────────────────────────────

export const liveStatusCache = new Map<string, TwitchStream>();

// ─── Router ───────────────────────────────────────────────────────────────────

export function createTwitchRoutes() {
  const router = Router();

  // GET /api/twitch/streams — streams live en ce moment
  router.get('/streams', async (req, res) => {
    try {
      const config = await loadTwitchConfig();

      if (!config.channels.length) {
        return res.json({ streams: [], configured: false });
      }

      const twitchConfigured =
        process.env.TWITCH_CLIENT_ID &&
        process.env.TWITCH_CLIENT_SECRET &&
        process.env.TWITCH_CLIENT_ID !== 'your_twitch_client_id_here';

      if (!twitchConfigured) {
        return res.json({ streams: [], configured: false, error: 'Twitch API non configurée' });
      }

      const streams = await fetchLiveStreams(config.channels);

      // Enrichir avec les avatars
      if (streams.length > 0) {
        const profiles = await fetchUserProfiles(streams.map(s => s.user_login));
        streams.forEach(s => {
          s.profile_image_url = profiles.get(s.user_login.toLowerCase()) || '';
          // Remplacer les placeholders de la thumbnail
          s.thumbnail_url = s.thumbnail_url
            .replace('{width}', '440')
            .replace('{height}', '248');
        });
      }

      // Mettre à jour le cache
      liveStatusCache.clear();
      streams.forEach(s => liveStatusCache.set(s.user_login.toLowerCase(), s));

      res.json({ streams, configured: true, total: streams.length });
    } catch (error: any) {
      console.error('❌ Erreur /api/twitch/streams:', error);
      res.status(500).json({ error: 'Erreur Twitch API', details: error.message });
    }
  });

  // GET /api/twitch/config — config actuelle (channels surveillés, canal notif, rôle)
  router.get('/config', async (req, res) => {
    try {
      const config = await loadTwitchConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Erreur chargement config' });
    }
  });

  // PUT /api/twitch/config — mettre à jour la config (admin seulement)
  router.put('/config', isAdmin, async (req, res) => {
    try {
      const { channels, notifyChannelId, roleId } = req.body;

      if (!Array.isArray(channels)) {
        return res.status(400).json({ error: 'channels doit être un tableau' });
      }

      const config: TwitchConfig = {
        channels: channels.map((c: string) => c.toLowerCase().trim()).filter(Boolean),
        notifyChannelId: notifyChannelId || '',
        roleId: roleId || undefined,
      };

      await saveTwitchConfig(config);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: 'Erreur sauvegarde config' });
    }
  });

  // POST /api/twitch/config/channels — ajouter un streamer (admin)
  router.post('/config/channels', isAdmin, async (req, res) => {
    try {
      const { channel } = req.body;
      if (!channel || typeof channel !== 'string') {
        return res.status(400).json({ error: 'Nom de chaîne requis' });
      }

      const config = await loadTwitchConfig();
      const login = channel.toLowerCase().trim();

      if (config.channels.includes(login)) {
        return res.status(409).json({ error: 'Chaîne déjà surveillée' });
      }

      // Vérifier que la chaîne existe sur Twitch
      const token = await getTwitchToken();
      const clientId = process.env.TWITCH_CLIENT_ID!;
      const userData = await httpRequest({
        hostname: 'api.twitch.tv',
        path: `/helix/users?login=${encodeURIComponent(login)}`,
        method: 'GET',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userData.data || userData.data.length === 0) {
        return res.status(404).json({ error: 'Chaîne Twitch introuvable' });
      }

      config.channels.push(login);
      await saveTwitchConfig(config);
      res.json({ config, added: login, profile: userData.data[0] });
    } catch (error: any) {
      res.status(500).json({ error: 'Erreur ajout chaîne', details: error.message });
    }
  });

  // DELETE /api/twitch/config/channels/:login — retirer un streamer (admin)
  router.delete('/config/channels/:login', isAdmin, async (req, res) => {
    try {
      const login = req.params.login.toLowerCase();
      const config = await loadTwitchConfig();

      config.channels = config.channels.filter(c => c !== login);
      await saveTwitchConfig(config);
      res.json({ config, removed: login });
    } catch (error) {
      res.status(500).json({ error: 'Erreur suppression chaîne' });
    }
  });

  // GET /api/twitch/status — état du monitoring (configuré ou non)
  router.get('/status', async (req, res) => {
    const configured =
      !!process.env.TWITCH_CLIENT_ID &&
      process.env.TWITCH_CLIENT_ID !== 'your_twitch_client_id_here';

    const config = await loadTwitchConfig();

    res.json({
      configured,
      channelCount: config.channels.length,
      channels: config.channels,
      liveCount: liveStatusCache.size,
      liveChannels: Array.from(liveStatusCache.keys()),
    });
  });

  return router;
}
