import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { LogOut, Wifi, WifiOff, Bell } from 'lucide-react';
import clsx from 'clsx';

export default function Header() {
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();

  return (
    <header className="h-16 bg-discord-notquitedark border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-white">
          Bienvenue, {user?.username}
        </h2>
        
        {/* Indicateur de connexion WebSocket */}
        <div className={clsx(
          'flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm',
          connected ? 'bg-discord-green/20 text-discord-green' : 'bg-discord-red/20 text-discord-red'
        )}>
          {connected ? (
            <>
              <Wifi size={16} />
              <span>Temps réel actif</span>
            </>
          ) : (
            <>
              <WifiOff size={16} />
              <span>Déconnecté</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white hover:bg-discord-dark rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-discord-red rounded-full"></span>
        </button>

        {/* Profil utilisateur */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-700">
          <img
            src={`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png`}
            alt={user?.username}
            className="w-10 h-10 rounded-full ring-2 ring-discord-blurple"
          />
          <div className="hidden md:block">
            <p className="text-white text-sm font-medium">{user?.username}</p>
            <p className="text-gray-400 text-xs">
              {user?.isAdmin ? 'Administrateur' : 'Utilisateur'}
            </p>
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-discord-red hover:bg-discord-dark rounded-lg transition-colors"
          title="Se déconnecter"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
