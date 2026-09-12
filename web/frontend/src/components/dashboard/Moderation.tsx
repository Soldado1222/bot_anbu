import { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import {
  Users, Search, Shield, UserX, Ban, Clock, Mail,
  UserPlus, UserMinus, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

interface Member {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bot: boolean;
  joinedAt: string;
  roles: { id: string; name: string; color: string }[];
  permissions: { administrator: boolean; moderator: boolean };
}

interface Role {
  id: string;
  name: string;
  color: string;
}

// Modal de confirmation/saisie
function Modal({ title, message, onConfirm, onCancel, withInput, inputLabel, inputType = 'text' }: {
  title: string;
  message?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  withInput?: boolean;
  inputLabel?: string;
  inputType?: string;
}) {
  const [value, setValue] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d21] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        {message && <p className="text-gray-400 text-sm mb-4">{message}</p>}
        {withInput && (
          <input
            type={inputType}
            placeholder={inputLabel}
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full bg-[#111214] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 mb-4"
            autoFocus
          />
        )}
        <div className="flex space-x-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition text-sm">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(withInput ? value : undefined)}
            className="px-4 py-2 rounded-lg bg-discord-blurple text-white hover:bg-discord-blurple/80 transition text-sm font-semibold"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Moderation() {
  const [guildId, setGuildId] = useState<string>('');
  const [guildName, setGuildName] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modal, setModal] = useState<any>(null);

  useEffect(() => {
    fetchGuildInfo();
  }, []);

  useEffect(() => {
    if (guildId) {
      fetchMembers();
      fetchRoles();
    }
  }, [guildId]);

  const fetchGuildInfo = async () => {
    try {
      const res = await axios.get('/api/bot/guilds');
      if (res.data.length > 0) {
        setGuildId(res.data[0].id);
        setGuildName(res.data[0].name);
      }
    } catch {
      showNotification('error', 'Impossible de récupérer les infos du serveur');
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/moderation/guild/${guildId}/members`);
      setMembers(res.data.filter((m: Member) => !m.bot));
    } catch {
      showNotification('error', 'Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`/api/moderation/guild/${guildId}/roles`);
      setRoles(res.data);
    } catch { /* silent */ }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const openModal = (config: any) => setModal(config);
  const closeModal = () => setModal(null);

  const handleKick = (member: Member) => {
    openModal({
      title: `Expulser ${member.displayName}`,
      message: 'Cette action va expulser le membre du serveur.',
      withInput: true,
      inputLabel: 'Raison (optionnel)',
      onCancel: closeModal,
      onConfirm: async (reason: string) => {
        closeModal();
        setActionLoading(true);
        try {
          await axios.post(`/api/moderation/guild/${guildId}/member/${member.id}/kick`, { reason });
          showNotification('success', `${member.displayName} a été expulsé`);
          setSelectedMember(null);
          fetchMembers();
        } catch (e: any) {
          showNotification('error', e.response?.data?.error || 'Erreur kick');
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleBan = (member: Member) => {
    openModal({
      title: `Bannir ${member.displayName}`,
      message: 'Cette action va bannir définitivement le membre.',
      withInput: true,
      inputLabel: 'Raison (optionnel)',
      onCancel: closeModal,
      onConfirm: async (reason: string) => {
        closeModal();
        setActionLoading(true);
        try {
          await axios.post(`/api/moderation/guild/${guildId}/member/${member.id}/ban`, { reason, deleteMessages: true });
          showNotification('success', `${member.displayName} a été banni`);
          setSelectedMember(null);
          fetchMembers();
        } catch (e: any) {
          showNotification('error', e.response?.data?.error || 'Erreur ban');
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleTimeout = (member: Member) => {
    openModal({
      title: `Timeout ${member.displayName}`,
      message: 'Entrez la durée du timeout en minutes',
      withInput: true,
      inputLabel: 'Durée en minutes (ex: 10, 60, 1440)',
      inputType: 'number',
      onCancel: closeModal,
      onConfirm: async (duration: string) => {
        closeModal();
        if (!duration) return;
        setActionLoading(true);
        try {
          await axios.post(`/api/moderation/guild/${guildId}/member/${member.id}/timeout`, { duration: parseInt(duration), reason: 'Timeout via dashboard' });
          showNotification('success', `Timeout appliqué à ${member.displayName}`);
        } catch (e: any) {
          showNotification('error', e.response?.data?.error || 'Erreur timeout');
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleDM = (member: Member) => {
    openModal({
      title: `Message privé à ${member.displayName}`,
      withInput: true,
      inputLabel: 'Votre message...',
      onCancel: closeModal,
      onConfirm: async (message: string) => {
        closeModal();
        if (!message) return;
        setActionLoading(true);
        try {
          await axios.post(`/api/moderation/guild/${guildId}/member/${member.id}/dm`, { message });
          showNotification('success', 'Message privé envoyé');
        } catch (e: any) {
          showNotification('error', e.response?.data?.error || 'Erreur DM');
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleRoleToggle = async (memberId: string, roleId: string, hasRole: boolean) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/moderation/guild/${guildId}/member/${memberId}/role`, {
        roleId,
        action: hasRole ? 'remove' : 'add',
      });
      showNotification('success', hasRole ? 'Rôle retiré' : 'Rôle ajouté');
      // Met à jour localement le membre sélectionné
      const updatedMembers = await axios.get(`/api/moderation/guild/${guildId}/members`);
      const updated = updatedMembers.data.find((m: Member) => m.id === memberId);
      if (updated) setSelectedMember(updated);
      setMembers(updatedMembers.data.filter((m: Member) => !m.bot));
    } catch (e: any) {
      showNotification('error', e.response?.data?.error || 'Erreur modification rôle');
    } finally { setActionLoading(false); }
  };

  const filteredMembers = members.filter(m =>
    m.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {modal && <Modal {...modal} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-discord-red/10 rounded-xl">
            <Shield className="text-discord-red" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Modération</h1>
            <p className="text-gray-400">{guildName || 'Chargement...'} · {members.length} membres</p>
          </div>
        </div>
        <button
          onClick={fetchMembers}
          disabled={loading}
          className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-gray-400 hover:text-white transition"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="text-sm">Rafraîchir</span>
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={clsx(
          'p-4 rounded-xl border flex items-center space-x-3 transition-all',
          notification.type === 'success'
            ? 'bg-discord-green/10 border-discord-green/20 text-discord-green'
            : 'bg-discord-red/10 border-discord-red/20 text-discord-red'
        )}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Rechercher un membre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#1a1d21] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple/50"
        />
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-discord-blurple border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Liste des membres */}
          <div className="bg-[#1a1d21] rounded-xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center space-x-2">
              <Users size={17} className="text-discord-blurple" />
              <span className="text-white font-semibold">{filteredMembers.length} membre(s)</span>
            </div>
            <div className="overflow-y-auto max-h-[520px] divide-y divide-white/5">
              {filteredMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-5 py-3.5 transition hover:bg-white/5 text-left',
                    selectedMember?.id === member.id && 'bg-discord-blurple/10 border-l-2 border-discord-blurple'
                  )}
                >
                  <img src={member.avatar} alt={member.username} className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{member.displayName}</p>
                    <p className="text-gray-500 text-xs">@{member.username}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {member.permissions.administrator && (
                      <span className="text-xs bg-discord-red/20 text-discord-red px-1.5 py-0.5 rounded font-medium">Admin</span>
                    )}
                    {member.roles.length > 0 && (
                      <span className="text-xs bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">{member.roles.length} rôle{member.roles.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <div className="py-12 text-center text-gray-500">Aucun membre trouvé</div>
              )}
            </div>
          </div>

          {/* Détails membre */}
          {selectedMember ? (
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 overflow-hidden">
              {/* Bannière profil */}
              <div className="bg-gradient-to-r from-discord-blurple/30 to-purple-900/20 px-6 py-5 border-b border-white/5">
                <div className="flex items-center space-x-4">
                  <img src={selectedMember.avatar} alt={selectedMember.username} className="w-16 h-16 rounded-full ring-4 ring-white/10" />
                  <div>
                    <h3 className="text-white font-bold text-lg">{selectedMember.displayName}</h3>
                    <p className="text-gray-400 text-sm">@{selectedMember.username}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Rejoint le {new Date(selectedMember.joinedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto max-h-[440px]">
                {/* Rôles */}
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
                    Rôles · {selectedMember.roles.length}
                  </h4>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {roles.map(role => {
                      const hasRole = selectedMember.roles.some(mr => mr.id === role.id);
                      return (
                        <button
                          key={role.id}
                          onClick={() => handleRoleToggle(selectedMember.id, role.id, hasRole)}
                          disabled={actionLoading}
                          className={clsx(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-sm',
                            hasRole
                              ? 'bg-white/10 border border-white/15 text-white'
                              : 'bg-white/3 hover:bg-white/8 text-gray-400 border border-transparent'
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: role.color !== '#000000' ? role.color : '#5865F2' }}
                            />
                            <span>{role.name}</span>
                          </div>
                          {hasRole
                            ? <UserMinus size={13} className="text-discord-red" />
                            : <UserPlus size={13} className="text-discord-green" />
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDM(selectedMember)}
                      disabled={actionLoading}
                      className="flex items-center justify-center space-x-2 bg-discord-blurple/10 hover:bg-discord-blurple/20 text-discord-blurple px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-sm font-medium"
                    >
                      <Mail size={15} />
                      <span>Message privé</span>
                    </button>

                    <button
                      onClick={() => handleTimeout(selectedMember)}
                      disabled={actionLoading || selectedMember.permissions.administrator}
                      className="flex items-center justify-center space-x-2 bg-discord-yellow/10 hover:bg-discord-yellow/20 text-discord-yellow px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-sm font-medium"
                    >
                      <Clock size={15} />
                      <span>Timeout</span>
                    </button>

                    <button
                      onClick={() => handleKick(selectedMember)}
                      disabled={actionLoading || selectedMember.permissions.administrator}
                      className="flex items-center justify-center space-x-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-sm font-medium"
                    >
                      <UserX size={15} />
                      <span>Kick</span>
                    </button>

                    <button
                      onClick={() => handleBan(selectedMember)}
                      disabled={actionLoading || selectedMember.permissions.administrator}
                      className="flex items-center justify-center space-x-2 bg-discord-red/10 hover:bg-discord-red/20 text-discord-red px-4 py-2.5 rounded-lg transition disabled:opacity-50 text-sm font-medium"
                    >
                      <Ban size={15} />
                      <span>Bannir</span>
                    </button>
                  </div>

                  {selectedMember.permissions.administrator && (
                    <p className="text-xs text-gray-600 mt-3 flex items-center space-x-1">
                      <AlertCircle size={11} />
                      <span>Actions désactivées pour les administrateurs</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 flex flex-col items-center justify-center h-full min-h-[200px] text-center p-8">
              <Users size={40} className="text-gray-700 mb-3" />
              <p className="text-gray-500 font-medium">Sélectionnez un membre</p>
              <p className="text-gray-600 text-sm mt-1">pour voir son profil et le gérer</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
