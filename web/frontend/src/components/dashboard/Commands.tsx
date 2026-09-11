import { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import { Plus, Edit2, Trash2, Power, Save, X } from 'lucide-react';

interface CustomCommand {
  id: string;
  name: string;
  description: string;
  response: string;
  category: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BuiltInCommand {
  name: string;
  description: string;
  category: string;
  type: string;
}

export default function Commands() {
  const [builtInCommands, setBuiltInCommands] = useState<BuiltInCommand[]>([]);
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    response: '',
    category: 'custom' as 'fun' | 'utility' | 'moderation' | 'custom',
  });

  useEffect(() => {
    fetchCommands();
  }, []);

  const fetchCommands = async () => {
    try {
      const response = await axios.get('/api/commands');
      setBuiltInCommands(response.data.builtIn);
      setCustomCommands(response.data.custom);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/commands', formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', response: '', category: 'custom' });
      fetchCommands();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommand) return;
    
    try {
      await axios.put(`/api/commands/${editingCommand.id}`, formData);
      setEditingCommand(null);
      setFormData({ name: '', description: '', response: '', category: 'custom' });
      fetchCommands();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return;
    
    try {
      await axios.delete(`/api/commands/${id}`);
      fetchCommands();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await axios.patch(`/api/commands/${id}/toggle`);
      fetchCommands();
    } catch (error) {
      alert('Erreur lors du changement de statut');
    }
  };

  const startEdit = (command: CustomCommand) => {
    setEditingCommand(command);
    setFormData({
      name: command.name,
      description: command.description,
      response: command.response,
      category: command.category as any,
    });
    setShowCreateModal(true);
  };

  const cancelEdit = () => {
    setEditingCommand(null);
    setFormData({ name: '', description: '', response: '', category: 'custom' });
    setShowCreateModal(false);
  };

  if (loading) {
    return <div className="text-white">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestion des Commandes</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-discord-blurple hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
        >
          <Plus size={20} />
          <span>Nouvelle Commande</span>
        </button>
      </div>

      {/* Modal Création/Édition */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-discord-notquitedark rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingCommand ? 'Modifier la commande' : 'Créer une commande'}
              </h3>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editingCommand ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Nom de la commande</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-discord-dark text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-discord-blurple outline-none"
                  placeholder="ex: bienvenue"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-discord-dark text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-discord-blurple outline-none"
                  placeholder="ex: Message de bienvenue"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Réponse</label>
                <textarea
                  value={formData.response}
                  onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                  className="w-full bg-discord-dark text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-discord-blurple outline-none h-32"
                  placeholder="ex: Bienvenue sur le serveur !"
                  required
                />
                <p className="text-gray-500 text-sm mt-1">
                  Variables disponibles: {'{user}'}, {'{server}'}, {'{channel}'}
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-discord-dark text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-discord-blurple outline-none"
                >
                  <option value="custom">Personnalisée</option>
                  <option value="fun">Fun</option>
                  <option value="utility">Utilitaire</option>
                  <option value="moderation">Modération</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-discord-blurple hover:bg-opacity-90 text-white py-2 rounded-lg flex items-center justify-center space-x-2 transition"
                >
                  <Save size={20} />
                  <span>{editingCommand ? 'Mettre à jour' : 'Créer'}</span>
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commandes personnalisées */}
      <div className="bg-discord-notquitedark rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Commandes Personnalisées ({customCommands.length})</h3>
        
        {customCommands.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Aucune commande personnalisée. Créez-en une !</p>
        ) : (
          <div className="space-y-3">
            {customCommands.map((cmd) => (
              <div
                key={cmd.id}
                className="bg-discord-dark rounded-lg p-4 flex items-center justify-between hover:bg-opacity-80 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-white font-semibold">/{cmd.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      cmd.category === 'fun' ? 'bg-purple-500/20 text-purple-400' :
                      cmd.category === 'utility' ? 'bg-blue-500/20 text-blue-400' :
                      cmd.category === 'moderation' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {cmd.category}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      cmd.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {cmd.enabled ? 'Activée' : 'Désactivée'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{cmd.description}</p>
                  <p className="text-gray-500 text-sm mt-1 italic">"{cmd.response}"</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggle(cmd.id)}
                    className={`p-2 rounded-lg transition ${
                      cmd.enabled ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
                    }`}
                    title={cmd.enabled ? 'Désactiver' : 'Activer'}
                  >
                    <Power size={18} />
                  </button>
                  <button
                    onClick={() => startEdit(cmd)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition"
                    title="Modifier"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(cmd.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commandes Built-in */}
      <div className="bg-discord-notquitedark rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Commandes Intégrées ({builtInCommands.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {builtInCommands.map((cmd) => (
            <div key={cmd.name} className="bg-discord-dark rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-white font-semibold">/{cmd.name}</h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  cmd.category === 'utility' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {cmd.category}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{cmd.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
