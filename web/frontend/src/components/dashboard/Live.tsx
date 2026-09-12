import { useEffect, useState, useRef } from 'react';
import axios from '../../lib/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Radio, Users, Gamepad2, ExternalLink, Plus, Trash2,
  RefreshCw, Tv2, AlertCircle, WifiOff, Settings2, Eye,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitchStream {
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  started_at: string;
  profile_image_url?: string;
}

interface TwitchConfig {
  channels: string[];
  notifyChannelId: string;
  roleId?: string;
}

type NotifType = 'success' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString('fr-FR');
}

// ─── Composant carte stream ───────────────────────────────────────────────────

function StreamCard({ stream }: { stream: TwitchStream }) {
  const [imgError, setImgError] = useState(false);
  // Bust le cache Twitch sur la thumbnail (change toutes les 5 min)
  const thumbUrl = `${stream.thumbnail_url}?t=${Math.floor(Date.now() / 300000)}`;

  return (
    <div className="group bg-[#1a1d21] rounded-xl border border-white/5 overflow-hidden hover:border-[#9146FF]/40 transition-all duration-200 hover:shadow-lg hover:shadow-[#9146FF]/10">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0e0f11] overflow-hidden">
        {!imgError ? (
          <img
            src={thumbUrl}
            alt={`${stream.user_name} stream`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tv2 size={48} className="text-gray-700" />
          </div>
        )}

        {/* Badge LIVE */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Durée */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md">
          {formatDuration(stream.started_at)}
        </div>

        {/* Viewers overlay au hover */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <div className="flex items-center gap-1.5 text-white text-sm font-medium">
            <Eye size={14} className="text-red-400" />
            {formatViewers(stream.viewer_count)} spectateurs
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {stream.profile_image_url ? (
            <img
              src={stream.profile_image_url}
              alt={stream.user_name}
              className="w-10 h-10 rounded-full ring-2 ring-[#9146FF]/40 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#9146FF]/20 flex items-center justify-center flex-shrink-0">
              <Radio size={18} className="text-[#9146FF]" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Nom streamer */}
            <a
              href={`https://twitch.tv/${stream.user_login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-semibold text-sm hover:text-[#9146FF] transition-colors flex items-center gap-1 group/link"
            >
              {stream.user_name}
              <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </a>

            {/* Titre */}
            <p className="text-gray-400 text-xs mt-0.5 truncate" title={stream.title}>
              {stream.title || 'Sans titre'}
            </p>

            {/* Jeu + viewers */}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-[#9146FF] font-medium">
                <Gamepad2 size={12} />
                {stream.game_name || 'N/A'}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users size={12} />
                {formatViewers(stream.viewer_count)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3">
        <a
          href={`https://twitch.tv/${stream.user_login}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#9146FF]/15 hover:bg-[#9146FF]/30 text-[#9146FF] text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <Radio size={14} />
          Regarder le live
        </a>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Live() {
  const [streams, setStreams] = useState<TwitchStream[]>([]);
  const [config, setConfig] = useState<TwitchConfig>({ channels: [], notifyChannelId: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: NotifType } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { lastMessage } = useWebSocket();
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;

  // ─── Helpers notif ────────────────────────────────────────────────────────

  const showNotif = (msg: string, type: NotifType = 'success') => {
    setNotif({ msg, type });
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotif(null), 3500);
  };

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchStreams = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [streamsRes, configRes] = await Promise.all([
        axios.get('/api/twitch/streams'),
        axios.get('/api/twitch/config'),
      ]);
      setStreams(streamsRes.data.streams || []);
      setConfigured(streamsRes.data.configured !== false);
      setConfig(configRes.data);
      setLastUpdated(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Polling 60s + WS
  useEffect(() => {
    fetchStreams();
    const interval = setInterval(() => fetchStreams(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Écouter les events WebSocket Twitch
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'twitch:streams') {
      setStreams(lastMessage.data.streams || []);
      setLastUpdated(new Date());
    }

    if (lastMessage.type === 'twitch:goLive') {
      const s: TwitchStream = lastMessage.data;
      setStreams(prev => {
        if (prev.find(x => x.user_login === s.user_login)) return prev;
        return [s, ...prev];
      });
      showNotif(`🔴 ${s.user_name} est maintenant en live !`);
      setLastUpdated(new Date());
    }

    if (lastMessage.type === 'twitch:goOffline') {
      const { user_login } = lastMessage.data;
      setStreams(prev => prev.filter(s => s.user_login !== user_login));
      showNotif(`⚫ ${user_login} n'est plus en live`, 'error');
      setLastUpdated(new Date());
    }
  }, [lastMessage]);

  // ─── Actions config ───────────────────────────────────────────────────────

  const handleAddChannel = async () => {
    const name = newChannel.trim();
    if (!name) return;
    setAddingChannel(true);
    try {
      await axios.post('/api/twitch/config/channels', { channel: name });
      setNewChannel('');
      await fetchStreams(true);
      showNotif(`✅ ${name} ajouté à la surveillance`);
    } catch (err: any) {
      showNotif(err?.response?.data?.error || 'Erreur lors de l\'ajout', 'error');
    } finally {
      setAddingChannel(false);
    }
  };

  const handleRemoveChannel = async (login: string) => {
    try {
      await axios.delete(`/api/twitch/config/channels/${login}`);
      setConfig(prev => ({ ...prev, channels: prev.channels.filter(c => c !== login) }));
      setStreams(prev => prev.filter(s => s.user_login.toLowerCase() !== login));
      showNotif(`🗑️ ${login} retiré de la surveillance`);
    } catch {
      showNotif('Erreur lors de la suppression', 'error');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#9146FF] border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Notification toast */}
      {notif && (
        <div className={clsx(
          'fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border animate-fade-in',
          notif.type === 'success'
            ? 'bg-[#1a1d21] border-discord-green/40 text-discord-green'
            : 'bg-[#1a1d21] border-discord-red/40 text-discord-red'
        )}>
          {notif.msg}
        </div>
      )}

      {/* Hero */}
      <div className="relative bg-gradient-to-r from-[#9146FF]/20 via-purple-900/10 to-transparent rounded-2xl p-6 border border-[#9146FF]/25 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.1))]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#9146FF]/20 flex items-center justify-center ring-2 ring-[#9146FF]/40">
              <Radio size={28} className="text-[#9146FF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Live Twitch</h1>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  {streams.length > 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm text-red-400 font-medium">
                        {streams.length} stream{streams.length > 1 ? 's' : ''} en cours
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      <span className="text-sm text-gray-400">Aucun live en cours</span>
                    </>
                  )}
                </div>
                <span className="text-gray-600">•</span>
                <span className="text-sm text-gray-400">
                  {config.channels.length} chaîne{config.channels.length !== 1 ? 's' : ''} surveillée{config.channels.length !== 1 ? 's' : ''}
                </span>
                {lastUpdated && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs text-gray-500">
                      Mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStreams(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowConfig(v => !v)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  showConfig
                    ? 'bg-[#9146FF]/30 text-[#9146FF]'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                )}
              >
                <Settings2 size={14} />
                Config
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Twitch non configurée */}
      {!configured && (
        <div className="bg-[#1a1d21] border border-discord-yellow/30 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-discord-yellow flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-discord-yellow font-medium text-sm">Twitch API non configurée</p>
            <p className="text-gray-400 text-xs mt-1">
              Ajoutez <code className="bg-white/10 px-1 rounded">TWITCH_CLIENT_ID</code> et{' '}
              <code className="bg-white/10 px-1 rounded">TWITCH_CLIENT_SECRET</code> dans le fichier{' '}
              <code className="bg-white/10 px-1 rounded">.env</code> du backend.
            </p>
          </div>
        </div>
      )}

      {/* Panneau de configuration (admin) */}
      {showConfig && isAdmin && (
        <div className="bg-[#1a1d21] rounded-xl border border-[#9146FF]/20 p-5 space-y-4 animate-fade-in">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Settings2 size={16} className="text-[#9146FF]" />
            Configuration de la surveillance
          </h3>

          {/* Ajouter une chaîne */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newChannel}
              onChange={e => setNewChannel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddChannel()}
              placeholder="Nom de chaîne Twitch (ex: pokimane)"
              className="flex-1 bg-[#111214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#9146FF]/50 transition-colors"
            />
            <button
              onClick={handleAddChannel}
              disabled={addingChannel || !newChannel.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#9146FF] hover:bg-[#7c2ff0] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {addingChannel ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Ajouter
            </button>
          </div>

          {/* Liste des chaînes surveillées */}
          {config.channels.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Chaînes surveillées</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.channels.map(ch => {
                  const isLive = streams.some(s => s.user_login.toLowerCase() === ch);
                  return (
                    <div
                      key={ch}
                      className="flex items-center justify-between bg-[#111214] rounded-lg px-3 py-2 border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                        )} />
                        <span className="text-sm text-white">{ch}</span>
                        {isLive && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">LIVE</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveChannel(ch)}
                        className="text-gray-600 hover:text-discord-red transition-colors p-1 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm text-center py-3">
              Aucune chaîne surveillée. Ajoutez-en une ci-dessus.
            </p>
          )}
        </div>
      )}

      {/* Grille des streams */}
      {streams.length > 0 ? (
        <div>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            En live maintenant
            <span className="ml-1 text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
              {streams.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {streams.map(stream => (
              <StreamCard key={stream.user_login} stream={stream} />
            ))}
          </div>
        </div>
      ) : (
        /* État vide */
        <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#9146FF]/10 flex items-center justify-center mb-4">
            <WifiOff size={32} className="text-[#9146FF]/50" />
          </div>
          <p className="text-white font-semibold mb-1">Personne n'est en live</p>
          <p className="text-gray-500 text-sm max-w-xs">
            {config.channels.length === 0
              ? 'Aucune chaîne configurée. Activez la configuration et ajoutez des streamers à surveiller.'
              : `Les ${config.channels.length} chaîne${config.channels.length > 1 ? 's' : ''} surveillée${config.channels.length > 1 ? 's' : ''} ne sont pas en live pour le moment.`}
          </p>
          {config.channels.length === 0 && isAdmin && (
            <button
              onClick={() => setShowConfig(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#9146FF]/20 hover:bg-[#9146FF]/30 text-[#9146FF] text-sm font-medium rounded-lg transition-colors"
            >
              <Settings2 size={14} />
              Configurer
            </button>
          )}
        </div>
      )}

      {/* Chaînes offline (si config active mais offline) */}
      {config.channels.length > 0 && streams.length < config.channels.length && (
        <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-4">
          <h3 className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
            <Tv2 size={14} />
            Hors ligne
          </h3>
          <div className="flex flex-wrap gap-2">
            {config.channels
              .filter(ch => !streams.some(s => s.user_login.toLowerCase() === ch))
              .map(ch => (
                <a
                  key={ch}
                  href={`https://twitch.tv/${ch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  {ch}
                  <ExternalLink size={10} className="opacity-50" />
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
