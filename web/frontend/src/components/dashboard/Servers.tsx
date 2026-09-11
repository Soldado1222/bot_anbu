import { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import { Server, Users, Hash, Crown, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface Guild {
  id: string;
  name: string;
  memberCount: number;
  icon: string | null;
  ownerId: string;
  createdAt: string;
}

export default function Servers() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [guildDetails, setGuildDetails] = useState<any>(null);

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    try {
      const response = await axios.get('/api/stats/guilds');
      setGuilds(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des serveurs:', error);
      setLoading(false);
    }
  };

  const fetchGuildDetails = async (guildId: string) => {
    try {
      const response = await axios.get(`/api/stats/guilds/${guildId}`);
      setGuildDetails(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
    }
  };

  const handleGuildClick = (guildId: string) => {
    setSelectedGuild(guildId);
    fetchGuildDetails(guildId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-blurple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Serveurs</h1>
        <p className="text-gray-400">Gérez les serveurs où votre bot est présent</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des serveurs */}
        <div className="space-y-4">
          {guilds.map((guild, index) => (
            <div
              key={guild.id}
              onClick={() => handleGuildClick(guild.id)}
              className={clsx(
                'bg-discord-notquitedark rounded-xl p-6 border transition-all duration-200 cursor-pointer animate-fade-in',
                selectedGuild === guild.id
                  ? 'border-discord-blurple shadow-lg shadow-discord-blurple/30'
                  : 'border-gray-800 hover:border-gray-700'
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center space-x-4">
                {guild.icon ? (
                  <img
                    src={guild.icon}
                    alt={guild.name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-discord-blurple flex items-center justify-center">
                    <Server size={32} className="text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-white text-lg font-semibold mb-1">{guild.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span className="flex items-center">
                      <Users size={14} className="mr-1" />
                      {guild.memberCount} membres
                    </span>
                    <span className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(guild.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Détails du serveur sélectionné */}
        <div className="bg-discord-notquitedark rounded-xl p-6 border border-gray-800 sticky top-6">
          {guildDetails ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                {guildDetails.icon ? (
                  <img
                    src={guildDetails.icon}
                    alt={guildDetails.name}
                    className="w-20 h-20 rounded-full"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-discord-blurple flex items-center justify-center">
                    <Server size={40} className="text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-white text-2xl font-bold">{guildDetails.name}</h2>
                  <p className="text-gray-400">ID: {guildDetails.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400 flex items-center">
                    <Users size={16} className="mr-2" />
                    Membres
                  </span>
                  <span className="text-white font-semibold">{guildDetails.memberCount}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400 flex items-center">
                    <Hash size={16} className="mr-2" />
                    Canaux
                  </span>
                  <span className="text-white font-semibold">{guildDetails.channels?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-800">
                  <span className="text-gray-400 flex items-center">
                    <Crown size={16} className="mr-2" />
                    Rôles
                  </span>
                  <span className="text-white font-semibold">{guildDetails.roles?.length || 0}</span>
                </div>
              </div>

              {/* Liste des canaux */}
              <div>
                <h3 className="text-white font-semibold mb-3">Canaux textuels</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {guildDetails.channels
                    ?.filter((ch: any) => ch.type === 0)
                    .slice(0, 10)
                    .map((channel: any) => (
                      <div
                        key={channel.id}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors py-2"
                      >
                        <Hash size={16} />
                        <span className="text-sm">{channel.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Server size={48} className="mx-auto mb-4 opacity-50" />
                <p>Sélectionnez un serveur pour voir les détails</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
