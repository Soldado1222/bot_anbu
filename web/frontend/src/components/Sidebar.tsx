import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBotStatus } from '../contexts/BotStatusContext';
import {
  LayoutDashboard, Server, Zap, Shield,
  Settings, Sliders, FileText, LogOut, ChevronRight,
  Star, Cpu, Radio
} from 'lucide-react';
import clsx from 'clsx';

const navSections = [
  {
    label: 'GÉNÉRAL',
    items: [
      { name: 'Vue d\'ensemble', href: '/', icon: LayoutDashboard },
      { name: 'Serveurs', href: '/servers', icon: Server },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      { name: 'Automatisations', href: '/automations', icon: Zap },
      { name: 'Modération', href: '/moderation', icon: Shield },
      { name: 'Live Twitch', href: '/live', icon: Radio },
    ],
  },
  {
    label: 'AVANCÉ',
    items: [
      { name: 'Contrôles', href: '/controls', icon: Sliders },
      { name: 'Logs', href: '/logs', icon: FileText },
      { name: 'Paramètres', href: '/settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { botStatus } = useBotStatus();

  return (
    <div className="w-64 bg-[#1a1d21] border-r border-white/5 flex flex-col h-screen">
      {/* Header bot */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center space-x-3 p-2 rounded-xl bg-white/5">
          {botStatus?.user?.avatar ? (
            <img
              src={botStatus.user.avatar}
              alt="Bot"
              className="w-10 h-10 rounded-full ring-2 ring-discord-blurple/50"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center ring-2 ring-discord-blurple/50">
              <Cpu size={20} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">
              {botStatus?.user?.username || "L'ANBU"}
            </p>
            <div className="flex items-center space-x-1">
              <div className={clsx(
                'w-2 h-2 rounded-full',
                botStatus?.connected ? 'bg-discord-green animate-pulse' : 'bg-gray-500'
              )} />
              <span className="text-xs text-gray-400">
                {botStatus?.connected ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
          <div className="bg-discord-blurple/20 rounded-lg px-1.5 py-0.5">
            <span className="text-discord-blurple text-xs font-bold">BOT</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 text-sm',
                      isActive
                        ? 'bg-discord-blurple text-white font-semibold shadow-lg shadow-discord-blurple/25'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center space-x-3">
                        <item.icon size={17} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && <ChevronRight size={14} className="text-white/60" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profil utilisateur */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer group">
          <img
            src={`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png`}
            alt={user?.username}
            className="w-9 h-9 rounded-full"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://cdn.discordapp.com/embed/avatars/0.png`; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.username}</p>
            <p className="text-gray-500 text-xs flex items-center gap-1">
              {user?.isAdmin && <><Star size={10} className="text-discord-yellow fill-discord-yellow" /> Admin</>}
              {!user?.isAdmin && 'Utilisateur'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-discord-red hover:bg-discord-red/10 transition opacity-0 group-hover:opacity-100"
            title="Se déconnecter"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
