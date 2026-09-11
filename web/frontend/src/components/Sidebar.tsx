import { NavLink } from 'react-router-dom';
import { Home, Server, FileText, Settings, Sliders, Bot } from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Vue d\'ensemble', href: '/', icon: Home },
  { name: 'Serveurs', href: '/servers', icon: Server },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Contrôles', href: '/controls', icon: Sliders },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-discord-notquitedark border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-discord-blurple flex items-center justify-center">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Dashboard</h1>
            <p className="text-gray-400 text-xs">Gestion du bot</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end
            className={({ isActive }) =>
              clsx(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-discord-blurple text-white shadow-lg shadow-discord-blurple/30'
                  : 'text-gray-400 hover:bg-discord-dark hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'text-white' : ''} />
                <span className="font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="bg-discord-dark rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-discord-green animate-pulse"></div>
            <span className="text-white text-sm font-medium">Bot en ligne</span>
          </div>
          <p className="text-gray-400 text-xs">Tous les systèmes fonctionnent</p>
        </div>
      </div>
    </div>
  );
}
