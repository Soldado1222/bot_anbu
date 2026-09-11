import { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Server, Users, MessageSquare, Activity, TrendingUp, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface BotStats {
  guilds: number;
  users: number;
  channels: number;
  uptime: number;
  ping: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
  };
}

export default function Overview() {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'stats') {
      setStats(lastMessage.data);
      
      // Ajouter au graphique d'activité
      setActivityData(prev => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          guilds: lastMessage.data.guilds,
          ping: lastMessage.data.ping,
        }
      ]);
    }
  }, [lastMessage]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-blurple border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Serveurs',
      value: stats?.guilds || 0,
      icon: Server,
      color: 'discord-blurple',
      bgColor: 'bg-discord-blurple/20',
    },
    {
      name: 'Utilisateurs',
      value: stats?.users || 0,
      icon: Users,
      color: 'discord-green',
      bgColor: 'bg-discord-green/20',
    },
    {
      name: 'Canaux',
      value: stats?.channels || 0,
      icon: MessageSquare,
      color: 'discord-yellow',
      bgColor: 'bg-discord-yellow/20',
    },
    {
      name: 'Ping',
      value: `${stats?.ping || 0}ms`,
      icon: Activity,
      color: 'discord-fuchsia',
      bgColor: 'bg-discord-fuchsia/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Vue d'ensemble</h1>
        <p className="text-gray-400">Statistiques en temps réel de votre bot Discord</p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={stat.name}
            className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={clsx('p-3 rounded-lg', stat.bgColor)}>
                <stat.icon size={24} className={`text-${stat.color}`} />
              </div>
              <TrendingUp size={20} className="text-discord-green" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{stat.name}</h3>
            <p className="text-white text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique de ping */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
            <Activity size={20} className="mr-2 text-discord-blurple" />
            Latence du bot
          </h3>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2f33" />
                <XAxis dataKey="time" stroke="#8b9096" />
                <YAxis stroke="#8b9096" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#2c2f33', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#ffffff' }}
                />
                <Line type="monotone" dataKey="ping" stroke="#5865F2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Informations système */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
            <Clock size={20} className="mr-2 text-discord-green" />
            Informations système
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Temps de fonctionnement</span>
              <span className="text-white font-semibold">{formatUptime(stats?.uptime || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Mémoire utilisée</span>
              <span className="text-white font-semibold">
                {stats?.memoryUsage ? formatMemory(stats.memoryUsage.heapUsed) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-800">
              <span className="text-gray-400">Mémoire totale</span>
              <span className="text-white font-semibold">
                {stats?.memoryUsage ? formatMemory(stats.memoryUsage.heapTotal) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Latence API</span>
              <span className={clsx(
                'font-semibold',
                (stats?.ping || 0) < 100 ? 'text-discord-green' : 
                (stats?.ping || 0) < 200 ? 'text-discord-yellow' : 'text-discord-red'
              )}>
                {stats?.ping || 0}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
        <h3 className="text-white text-lg font-semibold mb-4">État du bot</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-discord-green animate-pulse"></div>
            <span className="text-white font-medium">Bot opérationnel</span>
          </div>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">Connecté à {stats?.guilds || 0} serveur(s)</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400">Surveillant {stats?.users || 0} utilisateur(s)</span>
        </div>
      </div>
    </div>
  );
}
