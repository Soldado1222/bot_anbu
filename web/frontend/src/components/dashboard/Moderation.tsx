import { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import { 
  Users, Search, Shield, UserX, Ban, Clock, Mail, 
  UserPlus, UserMinus, AlertCircle, CheckCircle
} from 'lucide-react';
import clsx from 'clsx';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
}

interface Member {
  id: string;
  username: string;
  discriminator: string;
  displayName: string;
  avatar: string;
  bot: boolean;
  joinedAt: string;
  roles: { id: string; name: string; color: string }[];
  permissions: {
    administrator: boolean;
    moderator: boolean;
  };
}

interface Role {
  id: string;
  name: string;
  color: string;
}

export default function Moderation() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchGuilds();
  }, []);

  useEffect(() => {
    if (selectedGuild) {
      fetchMembers();
      fetchRoles();
    }
  }, [selectedGuild]);

  const fetchGuilds = async () => {
    try {
      const res = await axios.get('/api/bot/guilds');
      setGuilds(res.data);
      if (res.data.length > 0) setSelectedGuild(res.data[0].id);
    } catch (error) {
      showNotification('error', 'Erreur lors du chargement des serveurs');
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/moderation/guild/${selectedGuild}/members`);
      setMembers(res.data);
    } catch (error) {
      showNotification('error', 'Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/api/automations/guild/roles');
      setRoles(res.data);
    } catch (error) {
      console.error('Erreur chargement rôles');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleKick = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir expulser ce membre ?')) return;
    
    setActionLoading(true);
    try {
      const reason = prompt('Raison de l\'expulsion (optionnel):');
      await axios.post(`/api/moderation/guild/${selectedGuild}/member/${memberId}/kick`, { reason });
      showNotification('success', 'Membre expulsé avec succès');
      fetchMembers();
      setSelectedMember(null);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Erreur lors de l\'expulsion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir bannir ce membre ?')) return;
    
    setActionLoading(true);
    try {
      const reason = prompt('Raison du bannissement (optionnel):');
      const deleteMessages = confirm('Supprimer les messages des dernières 24h ?');
      await axios.post(`/api/moderation/guild/${selectedGuild}/member/${memberId}/ban`, { reason, deleteMessages });
      showNotification('success', 'Membre banni avec succès');
      fetchMembers();
      setSelectedMember(null);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Erreur lors du bannissement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTimeout = async (memberId: string) => {
    setActionLoading(true);
    try {
      const duration = prompt('Durée du timeout en minutes (ex: 5, 60, 1440):');
      if (!duration) return;
      
      const reason = prompt('Raison du timeout (optionnel):');
      await axios.post(`/api/moderation/guild/${selectedGuild}/member/${memberId}/timeout`, { 
        duration: parseInt(duration), 
        reason 
      });
      showNotification('success', 'Timeout appliqué avec succès');
      fetchMembers();
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Erreur lors du timeout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleToggle = async (memberId: string, roleId: string, hasRole: boolean) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/moderation/guild/${selectedGuild}/member/${memberId}/role`, {
        roleId,
        action: hasRole ? 'remove' : 'add'
      });
      showNotification('success', hasRole ? 'Rôle retiré' : 'Rôle ajouté');
      fetchMembers();
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Erreur lors de la modification du rôle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendDM = async (memberId: string) => {
    setActionLoading(true);
    try {
      const message = prompt('Message à envoyer en privé:');
      if (!message) return;
      
      await axios.post(`/api/moderation/guild/${selectedGuild}/member/${memberId}/dm`, { message });
      showNotification('success', 'Message privé envoyé');
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Erreur lors de l\'envoi du message');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-discord-red/10 rounded-xl">
            <Shield className="text-discord-red" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Modération</h1>
            <p className="text-gray-400">Gérez les membres de votre serveur</p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={clsx(
          'p-4 rounded-xl border flex items-center space-x-3',
          notification.type === 'success' 
            ? 'bg-discord-green/10 border-discord-green/20 text-discord-green'
            : 'bg-discord-red/10 border-discord-red/20 text-discord-red'
        )}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sélection serveur */}
      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/5">
        <label className="block text-sm font-medium text-gray-300 mb-2">Serveur</label>
        <select
          value={selectedGuild}
          onChange={(e) => setSelectedGuild(e.target.value)}
          className="w-full bg-[#111214] border border-white/10 rounded-lg px-4 py-2.5 text-white"
        >
          {guilds.map(g => (
            <option key={g.id} value={g.id}>{g.name} ({g.memberCount} membres)</option>
          ))}
        </select>
      </div>

      {/* Recherche */}
      <div className="bg-[#1a1d21] rounded-xl p-6 border border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111214] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Liste des membres */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-discord-blurple border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste */}
          <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-6 space-y-3 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center space-x-2">
                <Users size={18} />
                <span>{filteredMembers.length} membre(s)</span>
              </h3>
            </div>

            {filteredMembers.map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={clsx(
                  'w-full flex items-center space-x-3 p-3 rounded-lg transition hover:bg-white/5',
                  selectedMember?.id === member.id && 'bg-discord-blurple/20 border border-discord-blurple/30'
                )}
              >
                <img src={member.avatar} alt={member.username} className="w-10 h-10 rounded-full" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white font-medium truncate">
                    {member.displayName}
                    {member.bot && <span className="ml-2 text-xs bg-discord-blurple/20 text-discord-blurple px-2 py-0.5 rounded">BOT</span>}
                  </p>
                  <p className="text-gray-400 text-xs">@{member.username}</p>
                </div>
                {member.permissions.administrator && (
                  <Shield size={16} className="text-discord-red" />
                )}
              </button>
            ))}
          </div>

          {/* Détails et actions */}
          {selectedMember ? (
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-6 space-y-6">
              {/* Info membre */}
              <div className="flex items-center space-x-4">
                <img src={selectedMember.avatar} alt={selectedMember.username} className="w-16 h-16 rounded-full" />
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedMember.displayName}</h3>
                  <p className="text-gray-400">@{selectedMember.username}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Rejoint le {new Date(selectedMember.joinedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Rôles */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                  <Users size={16} />
                  <span>Rôles ({selectedMember.roles.length})</span>
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roles.filter(r => r.name !== '@everyone').map(role => {
                    const hasRole = selectedMember.roles.some(mr => mr.id === role.id);
                    return (
                      <button
                        key={role.id}
                        onClick={() => handleRoleToggle(selectedMember.id, role.id, hasRole)}
                        disabled={actionLoading}
                        className={clsx(
                          'w-full flex items-center justify-between p-2 rounded-lg transition',
                          hasRole ? 'bg-white/10 border border-white/20' : 'bg-white/5 hover:bg-white/10'
                        )}
                      >
                        <span className="text-white text-sm" style={{ color: role.color !== '#000000' ? role.color : undefined }}>
                          {role.name}
                        </span>
                        {hasRole ? <UserMinus size={14} /> : <UserPlus size={14} className="text-gray-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="text-white font-semibold mb-3">Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSendDM(selectedMember.id)}
                    disabled={actionLoading}
                    className="flex items-center justify-center space-x-2 bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    <Mail size={16} />
                    <span className="text-sm">Message</span>
                  </button>

                  <button
                    onClick={() => handleTimeout(selectedMember.id)}
                    disabled={actionLoading || selectedMember.permissions.administrator}
                    className="flex items-center justify-center space-x-2 bg-discord-yellow/10 hover:bg-discord-yellow/20 text-discord-yellow px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    <Clock size={16} />
                    <span className="text-sm">Timeout</span>
                  </button>

                  <button
                    onClick={() => handleKick(selectedMember.id)}
                    disabled={actionLoading || selectedMember.permissions.administrator}
                    className="flex items-center justify-center space-x-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    <UserX size={16} />
                    <span className="text-sm">Kick</span>
                  </button>

                  <button
                    onClick={() => handleBan(selectedMember.id)}
                    disabled={actionLoading || selectedMember.permissions.administrator}
                    className="flex items-center justify-center space-x-2 bg-discord-red/10 hover:bg-discord-red/20 text-discord-red px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    <Ban size={16} />
                    <span className="text-sm">Ban</span>
                  </button>
                </div>

                {selectedMember.permissions.administrator && (
                  <p className="text-xs text-gray-500 mt-3 flex items-center space-x-1">
                    <AlertCircle size={12} />
                    <span>Les administrateurs ne peuvent pas être modérés</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-6 flex items-center justify-center h-full">
              <p className="text-gray-500">Sélectionnez un membre pour voir les détails</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
