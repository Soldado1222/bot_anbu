import { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import { Plus, Edit2, Trash2, Power, Save, X, Terminal, Search, Hash } from 'lucide-react';
import clsx from 'clsx';

interface CustomCommand {
  id: string;
  name: string;
  description: string;
  response: string;
  category: string;
  enabled: boolean;
  createdAt: string;
}

interface BuiltInCommand {
  name: string;
  description: string;
  category: string;
  type: string;
}

const PREFIX = '!';

const categoryColors: Record<string, string> = {
  fun: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  utility: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  moderation: 'bg-red-500/15 text-red-400 border-red-500/20',
  custom: 'bg-discord-blurple/15 text-discord-blurple border-discord-blurple/20',
};

export default function Commands() {
  const [builtInCommands, setBuiltInCommands] = useState<BuiltInCommand[]>([]);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCmd, setEditingCmd] = useState<CustomCommand | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'custom' | 'builtin'>('custom');
  const [formData, setFormData] = useState({ name: '', description: '', response: '', category: 'custom' });

  useEffect(() => { fetchCommands(); }, []);

  const fetchCommands = async () => {
    try {
      const res = await axios.get('/api/commands');
      setBuiltInCommands(res.data.builtIn);
      setCustomCommands(res.data.custom);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCmd) {
        await axios.put(`/api/commands/${editingCmd.id}`, formData);
      } else {
        await axios.post('/api/commands', formData);
      }
      closeModal();
      fetchCommands();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette commande ?')) return;
    await axios.delete(`/api/commands/${id}`);
    fetchCommands();
  };

  const handleToggle = async (id: string) => {
    await axios.patch(`/api/commands/${id}/toggle`);
    fetchCommands();
  };

  const openEdit = (cmd: CustomCommand) => {
    setEditingCmd(cmd);
    setFormData({ name: cmd.name, description: cmd.description, response: cmd.response, category: cmd.category });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCmd(null);
    setFormData({ name: '', description: '', response: '', category: 'custom' });
  };

  const filteredCustom = customCommands.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBuiltin = builtInCommands.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-discord-blurple border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal size={22} className="text-discord-blurple" /> Commandes
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Préfixe des commandes custom : <span className="text-discord-blurple font-bold">{PREFIX}</span></p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus size={16} /> Nouvelle commande
        </button>
      </div>

      {/* Barre recherche + onglets */}
      <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une commande..."
              className="w-full bg-white/5 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg border border-white/5 focus:border-discord-blurple/50 outline-none placeholder-gray-600"
            />
          </div>
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(['custom', 'builtin'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx('px-4 py-2 rounded-md text-sm font-medium transition', activeTab === tab ? 'bg-discord-blurple text-white' : 'text-gray-400 hover:text-white')}
              >
                {tab === 'custom' ? `Personnalisées (${customCommands.length})` : `Intégrées (${builtInCommands.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste commandes custom */}
      {activeTab === 'custom' && (
        <div className="space-y-2">
          {filteredCustom.length === 0 ? (
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-12 text-center">
              <Terminal size={40} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500">Aucune commande personnalisée</p>
              <p className="text-gray-600 text-sm mt-1">Créez votre première commande avec le préfixe <span className="text-discord-blurple">!</span></p>
            </div>
          ) : filteredCustom.map(cmd => (
            <div key={cmd.id} className="bg-[#1a1d21] rounded-xl border border-white/5 p-4 flex items-center gap-4 hover:border-white/10 transition group">
              <div className="w-10 h-10 rounded-lg bg-discord-blurple/10 flex items-center justify-center flex-shrink-0">
                <Hash size={18} className="text-discord-blurple" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-discord-blurple font-bold text-sm bg-discord-blurple/10 px-2 py-0.5 rounded">{PREFIX}{cmd.name}</code>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border', categoryColors[cmd.category] || categoryColors.custom)}>
                    {cmd.category}
                  </span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border', cmd.enabled ? 'bg-discord-green/10 text-discord-green border-discord-green/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20')}>
                    {cmd.enabled ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-1 truncate">{cmd.description}</p>
                <p className="text-gray-600 text-xs mt-0.5 truncate italic">→ "{cmd.response}"</p>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => handleToggle(cmd.id)} className={clsx('p-2 rounded-lg transition', cmd.enabled ? 'text-discord-green hover:bg-discord-green/10' : 'text-gray-500 hover:bg-white/5')} title={cmd.enabled ? 'Désactiver' : 'Activer'}>
                  <Power size={15} />
                </button>
                <button onClick={() => openEdit(cmd)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition" title="Modifier">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => handleDelete(cmd.id)} className="p-2 text-gray-500 hover:text-discord-red hover:bg-discord-red/10 rounded-lg transition" title="Supprimer">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste commandes built-in */}
      {activeTab === 'builtin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBuiltin.map(cmd => (
            <div key={cmd.name} className="bg-[#1a1d21] rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-white font-bold text-sm">/{cmd.name}</code>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full border', categoryColors[cmd.category] || categoryColors.custom)}>
                  {cmd.category}
                </span>
              </div>
              <p className="text-gray-500 text-sm">{cmd.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d21] rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white">{editingCmd ? 'Modifier la commande' : 'Nouvelle commande'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Nom de la commande</label>
                <div className="flex items-center bg-white/5 rounded-lg border border-white/5 focus-within:border-discord-blurple/50 overflow-hidden">
                  <span className="pl-3 text-discord-blurple font-bold text-sm">{PREFIX}</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="flex-1 bg-transparent text-white text-sm px-2 py-2.5 outline-none placeholder-gray-600"
                    placeholder="nom-commande"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 text-white text-sm px-3 py-2.5 rounded-lg border border-white/5 focus:border-discord-blurple/50 outline-none placeholder-gray-600"
                  placeholder="Description courte"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Réponse du bot</label>
                <textarea
                  value={formData.response}
                  onChange={e => setFormData({ ...formData, response: e.target.value })}
                  className="w-full bg-white/5 text-white text-sm px-3 py-2.5 rounded-lg border border-white/5 focus:border-discord-blurple/50 outline-none placeholder-gray-600 h-24 resize-none"
                  placeholder="Ce que le bot va répondre..."
                  required
                />
                <p className="text-gray-600 text-xs mt-1">Variables : <code className="text-discord-blurple">{'{user}'}</code> <code className="text-discord-blurple">{'{server}'}</code> <code className="text-discord-blurple">{'{channel}'}</code></p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white/5 text-white text-sm px-3 py-2.5 rounded-lg border border-white/5 focus:border-discord-blurple/50 outline-none"
                >
                  <option value="custom">Personnalisée</option>
                  <option value="fun">Fun</option>
                  <option value="utility">Utilitaire</option>
                  <option value="moderation">Modération</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-discord-blurple hover:bg-discord-blurple/90 text-white py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                  <Save size={15} /> {editingCmd ? 'Mettre à jour' : 'Créer'}
                </button>
                <button type="button" onClick={closeModal} className="px-5 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-lg text-sm transition">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
