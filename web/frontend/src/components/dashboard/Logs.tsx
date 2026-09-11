import { useEffect, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { FileText, MessageSquare, UserPlus, UserMinus, Filter, Search } from 'lucide-react';
import clsx from 'clsx';

interface LogEntry {
  type: string;
  data: any;
  timestamp: string;
}

const logTypeConfig = {
  message: {
    icon: MessageSquare,
    color: 'discord-blurple',
    label: 'Message',
  },
  memberJoin: {
    icon: UserPlus,
    color: 'discord-green',
    label: 'Membre rejoint',
  },
  memberLeave: {
    icon: UserMinus,
    color: 'discord-red',
    label: 'Membre parti',
  },
  stats: {
    icon: FileText,
    color: 'discord-yellow',
    label: 'Stats',
  },
};

export default function Logs() {
  const { messages } = useWebSocket();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLogs(messages.filter(msg => msg.type !== 'status'));
  }, [messages]);

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.type !== filter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return JSON.stringify(log.data).toLowerCase().includes(searchLower);
    }
    return true;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderLogContent = (log: LogEntry) => {
    switch (log.type) {
      case 'message':
        return (
          <div>
            <p className="text-white font-medium">{log.data.author.username}</p>
            <p className="text-gray-400 text-sm mt-1">{log.data.content}</p>
            <p className="text-gray-500 text-xs mt-1">
              {log.data.guild ? `${log.data.guild.name} > ` : ''}#{log.data.channel.name}
            </p>
          </div>
        );
      case 'memberJoin':
        return (
          <div>
            <p className="text-white">
              <span className="font-medium">{log.data.username}</span> a rejoint le serveur
            </p>
            <p className="text-gray-500 text-sm">{log.data.guildName}</p>
          </div>
        );
      case 'memberLeave':
        return (
          <div>
            <p className="text-white">
              <span className="font-medium">{log.data.username}</span> a quitté le serveur
            </p>
            <p className="text-gray-500 text-sm">{log.data.guildName}</p>
          </div>
        );
      case 'stats':
        return (
          <div>
            <p className="text-white">Mise à jour des statistiques</p>
            <p className="text-gray-400 text-sm">
              {log.data.guilds} serveurs • {log.data.users} utilisateurs • {log.data.ping}ms
            </p>
          </div>
        );
      default:
        return <p className="text-gray-400">{JSON.stringify(log.data)}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Logs en temps réel</h1>
        <p className="text-gray-400">Surveillez l'activité de votre bot en direct</p>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-discord-notquitedark rounded-xl p-4 border border-gray-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none"
            />
          </div>

          {/* Filtres */}
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none"
            >
              <option value="all">Tous les types</option>
              <option value="message">Messages</option>
              <option value="memberJoin">Arrivées</option>
              <option value="memberLeave">Départs</option>
              <option value="stats">Statistiques</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des logs */}
      <div className="bg-discord-notquitedark rounded-xl border border-gray-800 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {filteredLogs.slice().reverse().map((log, index) => {
                const config = logTypeConfig[log.type as keyof typeof logTypeConfig] || {
                  icon: FileText,
                  color: 'gray-400',
                  label: log.type,
                };
                const Icon = config.icon;

                return (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className="p-4 hover:bg-discord-dark transition-colors animate-fade-in"
                  >
                    <div className="flex items-start space-x-4">
                      <div className={clsx('p-2 rounded-lg bg-opacity-20', `bg-${config.color}`)}>
                        <Icon size={20} className={`text-${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className={clsx('text-sm font-medium', `text-${config.color}`)}>
                            {config.label}
                          </span>
                          <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        {renderLogContent(log)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucun log disponible</p>
                {searchTerm && <p className="text-sm mt-2">Essayez une autre recherche</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-discord-notquitedark rounded-lg p-4 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm mb-1">Total</p>
          <p className="text-white text-2xl font-bold">{logs.length}</p>
        </div>
        <div className="bg-discord-notquitedark rounded-lg p-4 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm mb-1">Messages</p>
          <p className="text-white text-2xl font-bold">
            {logs.filter(l => l.type === 'message').length}
          </p>
        </div>
        <div className="bg-discord-notquitedark rounded-lg p-4 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm mb-1">Arrivées</p>
          <p className="text-white text-2xl font-bold">
            {logs.filter(l => l.type === 'memberJoin').length}
          </p>
        </div>
        <div className="bg-discord-notquitedark rounded-lg p-4 border border-gray-800 text-center">
          <p className="text-gray-400 text-sm mb-1">Départs</p>
          <p className="text-white text-2xl font-bold">
            {logs.filter(l => l.type === 'memberLeave').length}
          </p>
        </div>
      </div>
    </div>
  );
}
