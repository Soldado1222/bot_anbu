import { useAuth } from '../../contexts/AuthContext';
import { Settings as SettingsIcon, Shield, Bell, Palette, Info } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
        <p className="text-gray-400">Configurez votre dashboard et vos préférences</p>
      </div>

      {/* Informations du compte */}
      <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
          <Shield size={20} className="mr-2 text-discord-blurple" />
          Informations du compte
        </h2>
        <div className="flex items-center space-x-4">
          <img
            src={`https://cdn.discordapp.com/avatars/${user?.id}/${user?.avatar}.png`}
            alt={user?.username}
            className="w-20 h-20 rounded-full ring-4 ring-discord-blurple"
          />
          <div>
            <p className="text-white text-xl font-semibold">{user?.username}</p>
            <p className="text-gray-400">ID: {user?.id}</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
              user?.isAdmin ? 'bg-discord-blurple/20 text-discord-blurple' : 'bg-gray-700 text-gray-300'
            }`}>
              {user?.isAdmin ? 'Administrateur' : 'Utilisateur'}
            </span>
          </div>
        </div>
      </div>

      {/* Préférences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
            <Bell size={20} className="mr-2 text-discord-green" />
            Notifications
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400">Notifications en temps réel</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400">Sons de notification</span>
              <input type="checkbox" className="toggle" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400">Alertes par email</span>
              <input type="checkbox" className="toggle" />
            </label>
          </div>
        </div>

        {/* Apparence */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
            <Palette size={20} className="mr-2 text-discord-fuchsia" />
            Apparence
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Thème</label>
              <select className="w-full px-4 py-2 bg-discord-dark text-white rounded-lg border border-gray-700 focus:border-discord-blurple focus:outline-none">
                <option>Sombre (par défaut)</option>
                <option>Automatique</option>
              </select>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-400">Animation réduite</span>
              <input type="checkbox" className="toggle" />
            </label>
          </div>
        </div>
      </div>

      {/* Informations système */}
      <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
          <Info size={20} className="mr-2 text-discord-yellow" />
          Informations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-1">Version du dashboard</p>
            <p className="text-white font-semibold">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">Dernière mise à jour</p>
            <p className="text-white font-semibold">2026-09-10</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">API</p>
            <p className="text-white font-semibold">Connecté</p>
          </div>
        </div>
      </div>

      {/* Permissions */}
      {user?.isAdmin && (
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800">
          <h2 className="text-white text-lg font-semibold mb-4 flex items-center">
            <SettingsIcon size={20} className="mr-2 text-discord-red" />
            Permissions administrateur
          </h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-discord-green"></div>
              <span className="text-gray-400">Contrôle total du bot</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-discord-green"></div>
              <span className="text-gray-400">Envoi de messages</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-discord-green"></div>
              <span className="text-gray-400">Modification du statut</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-discord-green"></div>
              <span className="text-gray-400">Redémarrage du bot</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
