import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Send, RefreshCw, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface BotStatus {
  connected: boolean;
  user: {
    username: string;
    avatar: string;
    tag: string;
  } | null;
  uptime: number;
  ping: number;
}

export default function Controls() {
  const { user } = useAuth();
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');
  const [statusActivity, setStatusActivity] = useState('');
  const [statusType, setStatusType] = useState('online');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchBotStatus();
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (selectedGuild) {
      fetchChannels(selectedGuild);
    }
  }, [selectedGuild]);

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get('/api/bot/status', { withCredentials: true });
      setBotStatus(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
    }
  };

  const fetchGuilds = async () => {
    try {
      const response = await axios.get('/api/stats/guilds', { withCredentials: true });
      setGuilds(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des serveurs:', error);
    }
  };

  const fetchChannels = async (guildId: string) => {
    try {
      const response = await axios.get(`/api/bot/guilds/${guildId}/channels`, { withCredentials: true });
      setChannels(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des canaux:', error);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSendMessage = async () => {
    if (!selectedChannel || !message.trim()) {
      showNotification('error', 'Veuillez sélectionner un canal et saisir un message');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/bot/send-message', {
        channelId: selectedChannel,
        content: message,
      }, { withCredentials: true });
      
      showNotification('success', 'Message envoyé avec succès');
      setMessage('');
    } catch (error) {
      showNotification('error', 'Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!user?.isAdmin) {
      showNotification('error', 'Droits administrateur requis');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/bot/status', {
        activity: statusActivity ? { name: statusActivity, type: 3 } : null,
        status: statusType,
      }, { withCredentials: true });
      
      showNotification('success', 'Statut mis à jour avec succès');
      fetchBotStatus();
    } catch (error) {
      showNotification('error', 'Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    if (!user?.isAdmin) {
      showNotification('error', 'Droits administrateur requis');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir redémarrer le bot ?')) return;

    try {
      await axios.post('/api/bot/restart', {}, { withCredentials: true });
      showNotification('success', 'Redémarrage du bot en cours...');
    } catch (error) {
      showNotification('error', 'Erreur lors du redémarrage');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Contrôles du bot</h1>
        <p className="text-gray-400">Gérez et contrôlez votre bot à distance</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={clsx(
          'p-4 rounded-lg flex items-center space-x-3 animate-fade-in',
          notification.type === 'success' ? 'bg-discord-green/20 text-discord-green' : 'bg-discord-red/20 text-discord-red'
        )}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Statut du bot */}
      <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
          <Activity size={20} className="mr-2 text-discord-blurple" />
          Statut du bot
        </h2>
        {botStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4">
              {botStatus.user && (
                <>
                  <img
                    src={`https://cdn.discordapp.com/avatars/${botStatus.user.tag.split('#')[0]}/${botStatus.user.avatar}.png`}
                    alt={botStatus.user.username}
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <p className="text-white font-semibold">{botStatus.user.username}</p>
                    <p className="text-gray-400 text-sm">{botStatus.user.tag}</p>
                    <div className="flex items-center mt-1">
                      <div className={clsx(
                        'w-2 h-2 rounded-full mr-2',
                        botStatus.connected ? 'bg-discord-green' : 'bg-discord-red'
                      )}></div>
                      <span className="text-sm text-gray-400">
                        {botStatus.connected ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Latence</span>
                <span className="text-white font-medium">{botStatus.ping}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Temps de fonctionnement</span>
                <span className="text-white font-medium">
                  {Math.floor(botStatus.uptime / 3600)}h {Math.floor((botStatus.uptime % 3600) / 60)}m
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Envoyer un message */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
            <Send size={20} className="mr-2 text-discord-green" />
            Envoyer un message
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Serveur</label>
              <select
                value={selectedGuild}
                onChange={(e) => setSelectedGuild(e.target.value)}
                className="w-full px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none"
              >
                <option value="">Sélectionner un serveur</option>
                {guilds.map(guild => (
                  <option key={guild.id} value={guild.id}>{guild.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Canal</label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                disabled={!selectedGuild}
                className="w-full px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none disabled:opacity-50"
              >
                <option value="">Sélectionner un canal</option>
                {channels.map(channel => (
                  <option key={channel.id} value={channel.id}>#{channel.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Entrez votre message..."
                rows={4}
                className="w-full px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={loading || !selectedChannel || !message.trim()}
              className="w-full bg-discord-blurple hover:bg-opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Send size={18} />
                  <span>Envoyer</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modifier le statut */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
            <Activity size={20} className="mr-2 text-discord-yellow" />
            Modifier le statut
            {!user?.isAdmin && <span className="ml-2 text-xs text-discord-red">(Admin requis)</span>}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Activité</label>
              <input
                type="text"
                value={statusActivity}
                onChange={(e) => setStatusActivity(e.target.value)}
                placeholder="Ex: les commandes /"
                disabled={!user?.isAdmin}
                className="w-full px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Statut</label>
              <select
                value={statusType}
                onChange={(e) => setStatusType(e.target.value)}
                disabled={!user?.isAdmin}
                className="w-full px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none disabled:opacity-50"
              >
                <option value="online">En ligne</option>
                <option value="idle">Inactif</option>
                <option value="dnd">Ne pas déranger</option>
                <option value="invisible">Invisible</option>
              </select>
            </div>

            <button
              onClick={handleUpdateStatus}
              disabled={loading || !user?.isAdmin}
              className="w-full bg-discord-yellow hover:bg-opacity-90 text-discord-dark font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour le statut'}
            </button>

            <button
              onClick={handleRestart}
              disabled={!user?.isAdmin}
              className="w-full bg-discord-red hover:bg-opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <RefreshCw size={18} />
              <span>Redémarrer le bot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
