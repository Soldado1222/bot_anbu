import { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import { useBotStatus } from '../../contexts/BotStatusContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Server, Users, Hash, Activity, Clock, Cpu, Zap, Terminal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface BotStats {
  guilds: number;
  users: number;
  channels: number;
  uptime: number;
  ping: number;
  memoryUsage?: { heapUsed: number; heapTotal: number };
}

export default function Overview() {
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pingHistory, setPingHistory] = useState<{ time: string; ping: number }[]>([]);
  const { botStatus } = useBotStatus();
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'stats') {
      setStats(lastMessage.data);
      setPingHistory(prev => [
        ...prev.slice(-19),
        { time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), ping: lastMessage.data.ping }
      ]);
    }
  }, [lastMessage]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
      setPingHistory(prev => [
        ...prev.slice(-19),
        { time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), ping: res.data.ping }
      ]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}j ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const statCards = [
    { name: 'Serveurs', value: stats?.guilds ?? 0, icon: Server, color: 'text-discord-blurple', bg: 'bg-discord-blurple/10', border: 'border-discord-blurple/20' },
    { name: 'Utilisateurs', value: stats?.users ?? 0, icon: Users, color: 'text-discord-green', bg: 'bg-discord-green/10', border: 'border-discord-green/20' },
    { name: 'Canaux', value: stats?.channels ?? 0, icon: Hash, color: 'text-discord-yellow', bg: 'bg-discord-yellow/10', border: 'border-discord-yellow/20' },
    { name: 'Ping', value: `${stats?.ping ?? 0}ms`, icon: Activity, color: 'text-discord-fuchsia', bg: 'bg-discord-fuchsia/10', border: 'border-discord-fuchsia/20' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-discord-blurple border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-discord-blurple/20 via-purple-900/10 to-transparent rounded-2xl p-6 border border-discord-blurple/20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.1))]" />
        <div className="flex items-center space-x-4 relative">
          {botStatus?.user?.avatar ? (
            <img src={botStatus.user.avatar} alt="Bot" className="w-16 h-16 rounded-2xl ring-2 ring-discord-blurple/50 shadow-xl" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-discord-blurple/30 flex items-center justify-center ring-2 ring-discord-blurple/50">
              <Cpu size={32} className="text-discord-blurple" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{botStatus?.user?.username || "L'ANBU"}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <div className="flex items-center space-x-1.5">
                <div className={clsx('w-2 h-2 rounded-full', botStatus?.connected ? 'bg-discord-green animate-pulse' : 'bg-gray-500')} />
                <span className="text-sm text-gray-300">{botStatus?.connected ? 'En ligne' : 'Hors ligne'}</span>
              </div>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Clock size={13} /> {formatUptime(stats?.uptime ?? 0)}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Zap size={13} className="text-discord-yellow" /> {stats?.ping ?? 0}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={card.name} className={clsx('rounded-xl p-5 border bg-[#1a1d21] animate-fade-in', card.border)} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', card.bg)}>
              <card.icon size={20} className={card.color} />
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-gray-500 text-sm mt-1">{card.name}</p>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ping chart */}
        <div className="lg:col-span-2 bg-[#1a1d21] rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity size={16} className="text-discord-blurple" /> Latence en temps réel
          </h3>
          {pingHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={pingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 11 }} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1d21', border: '1px solid #ffffff15', borderRadius: '8px', fontSize: 12 }} labelStyle={{ color: '#fff' }} />
                <Line type="monotone" dataKey="ping" stroke="#5865F2" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#5865F2' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">Collecte des données en cours...</div>
          )}
        </div>

        {/* Système */}
        <div className="bg-[#1a1d21] rounded-xl p-5 border border-white/5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu size={16} className="text-discord-green" /> Système
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Uptime', value: formatUptime(stats?.uptime ?? 0), color: 'text-discord-green' },
              { label: 'Mémoire', value: stats?.memoryUsage ? `${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(0)} MB` : 'N/A', color: 'text-discord-yellow' },
              { label: 'Ping API', value: `${stats?.ping ?? 0}ms`, color: (stats?.ping ?? 0) < 100 ? 'text-discord-green' : (stats?.ping ?? 0) < 200 ? 'text-discord-yellow' : 'text-discord-red' },
              { label: 'Serveurs', value: String(stats?.guilds ?? 0), color: 'text-discord-blurple' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-500 text-sm">{row.label}</span>
                <span className={clsx('font-semibold text-sm', row.color)}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accès rapide */}
      <div className="bg-[#1a1d21] rounded-xl p-5 border border-white/5">
        <h3 className="text-white font-semibold mb-4">Accès rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Commandes', icon: Terminal, href: '/commands', color: 'text-discord-blurple', bg: 'bg-discord-blurple/10 hover:bg-discord-blurple/20' },
            { label: 'Automatisations', icon: Zap, href: '/automations', color: 'text-discord-yellow', bg: 'bg-discord-yellow/10 hover:bg-discord-yellow/20' },
            { label: 'Contrôles', icon: Activity, href: '/controls', color: 'text-discord-green', bg: 'bg-discord-green/10 hover:bg-discord-green/20' },
            { label: 'Serveurs', icon: Server, href: '/servers', color: 'text-discord-fuchsia', bg: 'bg-discord-fuchsia/10 hover:bg-discord-fuchsia/20' },
          ].map(item => (
            <a key={item.label} href={item.href} className={clsx('flex flex-col items-center gap-2 p-4 rounded-xl transition cursor-pointer', item.bg)}>
              <item.icon size={22} className={item.color} />
              <span className="text-white text-sm font-medium">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
