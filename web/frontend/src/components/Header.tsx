import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useBotStatus } from '../contexts/BotStatusContext';
import { LogOut, Wifi, WifiOff, Activity } from 'lucide-react';
import clsx from 'clsx';

export default function Header() {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const { botStatus } = useBotStatus();

  return (
    <header className="h-14 bg-[#1a1d21] border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center space-x-3">
        {/* Statut ping */}
        {botStatus?.connected && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 text-xs">
            <Activity size={13} className={clsx(
              botStatus.ping < 100 ? 'text-discord-green' :
              botStatus.ping < 200 ? 'text-discord-yellow' : 'text-discord-red'
            )} />
            <span className="text-gray-300">{botStatus.ping}ms</span>
          </div>
        )}

        {/* WebSocket */}
        <div className={clsx(
          'flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs',
          connected ? 'bg-discord-green/10 text-discord-green' : 'bg-discord-red/10 text-discord-red'
        )}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{connected ? 'Temps réel' : 'Déconnecté'}</span>
        </div>
      </div>

      {/* Profil */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-white/5">
          <img
            src={`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png`}
            alt={user?.username}
            className="w-7 h-7 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`; }}
          />
          <div className="hidden md:block">
            <p className="text-white text-xs font-semibold leading-none">{user?.username}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">{user?.isAdmin ? '👑 Admin' : 'Membre'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 text-gray-500 hover:text-discord-red hover:bg-discord-red/10 rounded-lg transition"
          title="Se déconnecter"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
