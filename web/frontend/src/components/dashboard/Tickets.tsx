import { useState, useEffect, useCallback } from 'react';
import axios from '../../lib/axios';
import {
  Ticket, Settings, BarChart2, List, Send, Save, Trash2,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle,
  Clock, Hash, Tag, User, AlertCircle, Eye, Lock,
} from 'lucide-react';
import clsx from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

interface TicketEntry {
  id: string;
  channelId: string;
  userId: string;
  userTag: string;
  category: string;
  subject: string;
  createdAt: string;
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
}

interface TicketConfig {
  enabled: boolean;
  logChannelId: string;
  categoryId: string;
  supportRoleId: string;
  embedTitle: string;
  embedDescription: string;
  embedColor: string;
  embedThumbnail: string;
  maxPerUser: number;
}

interface Stats {
  total: number;
  open: number;
  closed: number;
  last7days: number;
  byCategory: Record<string, number>;
  byDay: { date: string; count: number }[];
}

interface Channel { id: string; name: string }
interface Category { id: string; name: string }
interface Role { id: string; name: string; color: string }

// ── Sub-components ─────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
        enabled ? 'bg-discord-blurple' : 'bg-gray-700'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-4 flex items-center gap-4">
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-gray-500 text-xs mt-1">{label}</p>
        {sub && <p className="text-gray-600 text-xs">{sub}</p>}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Bug: '#ed4245',
  Suggestion: '#fee75c',
  Partenariat: '#57f287',
  Autre: '#5865f2',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  open: { label: 'Ouvert', cls: 'bg-discord-green/10 text-discord-green border border-discord-green/20' },
  closed: { label: 'Fermé', cls: 'bg-gray-700/50 text-gray-400 border border-white/5' },
};

// ── Main component ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'tickets' | 'config';

export default function Tickets() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<TicketConfig | null>(null);
  const [tickets, setTickets] = useState<TicketEntry[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPages, setTicketsPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployChannel, setDeployChannel] = useState('');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, configRes, chRes, catRes, roleRes] = await Promise.all([
        axios.get('/api/tickets/stats').catch(() => ({ data: { total: 0, open: 0, closed: 0, last7days: 0, byCategory: {}, byDay: [] } })),
        axios.get('/api/tickets/config').catch(() => ({ data: { enabled: false, logChannelId: '', categoryId: '', supportRoleId: '', embedTitle: '🎫 Support & Tickets', embedDescription: '', embedColor: '#5865F2', embedThumbnail: '', maxPerUser: 1 } })),
        axios.get('/api/tickets/guild/channels').catch(() => ({ data: [] })),
        axios.get('/api/tickets/guild/categories').catch(() => ({ data: [] })),
        axios.get('/api/tickets/guild/roles').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setConfig(configRes.data);
      setChannels(chRes.data);
      setCategories(catRes.data);
      setRoles(roleRes.data);
    } catch (error: any) {
      console.error('Erreur chargement tickets:', error);
      showToast('err', 'Erreur lors du chargement des données');
      // Valeurs par défaut pour ne pas bloquer l'UI
      setStats({ total: 0, open: 0, closed: 0, last7days: 0, byCategory: {}, byDay: [] });
      setConfig({ enabled: false, logChannelId: '', categoryId: '', supportRoleId: '', embedTitle: '🎫 Support & Tickets', embedDescription: '', embedColor: '#5865F2', embedThumbnail: '', maxPerUser: 1 });
      setChannels([]);
      setCategories([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTickets = useCallback(async (page = 1) => {
    try {
      const res = await axios.get('/api/tickets/list', {
        params: { page, limit: 15, status: statusFilter, category: categoryFilter },
      });
      setTickets(res.data.tickets || []);
      setTicketsTotal(res.data.total || 0);
      setTicketsPage(res.data.page || 1);
      setTicketsPages(res.data.pages || 1);
    } catch (error: any) {
      console.error('Erreur chargement liste tickets:', error);
      // Valeurs par défaut
      setTickets([]);
      setTicketsTotal(0);
      setTicketsPage(1);
      setTicketsPages(1);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (tab === 'tickets') loadTickets(1); }, [tab, loadTickets]);

  // ── Save config ────────────────────────────────────────────────────────
  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await axios.patch('/api/tickets/config', config);
      showToast('ok', 'Configuration sauvegardée !');
    } catch {
      showToast('err', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── Deploy panel ───────────────────────────────────────────────────────
  const deployPanel = async () => {
    if (!deployChannel) {
      showToast('err', 'Sélectionne un canal pour déployer le panneau');
      return;
    }
    setDeploying(true);
    try {
      const res = await axios.post('/api/tickets/deploy', { channelId: deployChannel });
      showToast('ok', res.data.message || 'Panneau déployé !');
    } catch (e: any) {
      showToast('err', e?.response?.data?.error || 'Erreur lors du déploiement');
    } finally {
      setDeploying(false);
    }
  };

  // ── Close ticket ───────────────────────────────────────────────────────
  const closeTicket = async (ticketId: string) => {
    try {
      await axios.post(`/api/tickets/close/${ticketId}`, { reason: closeReason || 'Fermé depuis le dashboard' });
      showToast('ok', 'Ticket fermé avec succès');
      setClosingId(null);
      setCloseReason('');
      loadTickets(ticketsPage);
      loadAll();
    } catch (e: any) {
      showToast('err', e?.response?.data?.error || 'Erreur lors de la fermeture');
    }
  };

  // ── Delete ticket from history ────────────────────────────────────────
  const deleteTicket = async (ticketId: string) => {
    try {
      await axios.delete(`/api/tickets/${ticketId}`);
      showToast('ok', 'Ticket supprimé de l\'historique');
      setDeletingId(null);
      loadTickets(ticketsPage);
      loadAll();
    } catch {
      showToast('err', 'Erreur lors de la suppression');
    }
  };

  const updateConfig = (field: keyof TicketConfig, value: any) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : prev);
  };

  // ── Shared styles ──────────────────────────────────────────────────────
  const inputCls = 'w-full bg-white/5 text-white text-sm px-3 py-2.5 rounded-lg border border-white/5 focus:border-discord-blurple/50 outline-none placeholder-gray-600';
  const labelCls = 'block text-gray-400 text-sm mb-1.5';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-discord-blurple border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ticket size={22} className="text-discord-blurple" />
            Système de Tickets
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gérez les tickets de support de votre serveur
          </p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={clsx(
            'px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2',
            toast.type === 'ok'
              ? 'bg-discord-green/10 text-discord-green border border-discord-green/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}
        >
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {(
          [
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart2 },
            { id: 'tickets', label: 'Tickets', icon: List },
            { id: 'config', label: 'Configuration', icon: Settings },
          ] as { id: Tab; label: string; icon: any }[]
        ).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-discord-blurple text-white shadow'
                : 'text-gray-400 hover:text-white'
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB — VUE D'ENSEMBLE
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && stats && (
        <div className="space-y-5">

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Ticket}       label="Total tickets"   value={stats.total}     color="bg-discord-blurple/20" />
            <StatCard icon={Clock}        label="Tickets ouverts" value={stats.open}      color="bg-discord-green/20"   sub="En attente" />
            <StatCard icon={CheckCircle}  label="Tickets fermés"  value={stats.closed}    color="bg-gray-600/30"        />
            <StatCard icon={BarChart2}    label="7 derniers jours" value={stats.last7days} color="bg-yellow-500/20"     />
          </div>

          {/* Graphique + répartition par catégorie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Graphique bar — tickets par jour */}
            <div className="lg:col-span-2 bg-[#1a1d21] rounded-xl border border-white/5 p-5">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <BarChart2 size={15} className="text-discord-blurple" />
                Tickets ouverts — 7 derniers jours
              </h2>
              {stats.byDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={stats.byDay} barSize={24}>
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{ background: '#111214', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                      cursor={{ fill: 'rgba(88,101,242,0.1)' }}
                    />
                    <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                      {stats.byDay.map((_, i) => (
                        <Cell key={i} fill="#5865f2" opacity={0.8 - i * 0.05} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                  Aucun ticket sur cette période
                </div>
              )}
            </div>

            {/* Répartition par catégorie */}
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-5">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Tag size={15} className="text-discord-blurple" />
                Par catégorie
              </h2>
              <div className="space-y-3">
                {Object.entries(stats.byCategory).length > 0 ? (
                  Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => {
                      const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      const color = CATEGORY_COLORS[cat] || '#5865f2';
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300 font-medium">{cat}</span>
                            <span className="text-gray-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-gray-600 text-sm text-center mt-8">Aucun ticket encore</p>
                )}
              </div>
            </div>
          </div>

          {/* Déploiement rapide */}
          <div className="bg-[#1a1d21] rounded-xl border border-discord-blurple/20 p-5">
            <h2 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
              <Send size={15} className="text-discord-blurple" />
              Déploiement rapide du panneau
            </h2>
            <p className="text-gray-500 text-xs mb-4">
              Envoie le panneau de tickets dans un canal Discord directement depuis ici.
            </p>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className={labelCls}>Canal de destination</label>
                <select
                  value={deployChannel}
                  onChange={e => setDeployChannel(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sélectionner un canal</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={deployPanel}
                disabled={deploying || !deployChannel}
                className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                <Send size={14} />
                {deploying ? 'Déploiement...' : 'Déployer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB — LISTE DES TICKETS
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'tickets' && (
        <div className="space-y-4">

          {/* Filtres */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); loadTickets(1); }}
                className={clsx(inputCls, 'cursor-pointer')}
              >
                <option value="all">Tous les statuts</option>
                <option value="open">Ouverts</option>
                <option value="closed">Fermés</option>
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); loadTickets(1); }}
                className={clsx(inputCls, 'cursor-pointer')}
              >
                <option value="all">Toutes les catégories</option>
                {['Bug', 'Suggestion', 'Partenariat', 'Autre'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="text-gray-500 text-sm self-center">
              {ticketsTotal} ticket(s) trouvé(s)
            </div>
          </div>

          {/* Liste */}
          {tickets.length === 0 ? (
            <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-12 text-center">
              <Ticket size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Aucun ticket trouvé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="bg-[#1a1d21] rounded-xl border border-white/5 overflow-hidden"
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/2 transition"
                    onClick={() =>
                      setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)
                    }
                  >
                    {/* Catégorie dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[ticket.category] || '#5865f2' }}
                    />

                    {/* Infos principales */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm truncate">
                          {ticket.id}
                        </span>
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            STATUS_BADGE[ticket.status].cls
                          )}
                        >
                          {STATUS_BADGE[ticket.status].label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                          {ticket.category}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{ticket.subject}</p>
                    </div>

                    {/* Meta */}
                    <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <User size={11} /> {ticket.userTag}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ticket.status === 'open' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setClosingId(ticket.id);
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                          title="Fermer le ticket"
                        >
                          <Lock size={13} />
                        </button>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeletingId(ticket.id);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-red-400 transition"
                        title="Supprimer de l'historique"
                      >
                        <Trash2 size={13} />
                      </button>
                      {expandedTicket === ticket.id ? (
                        <ChevronUp size={14} className="text-gray-600" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-600" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedTicket === ticket.id && (
                    <div className="px-5 pb-4 border-t border-white/5 pt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-gray-600 mb-0.5">Créateur</p>
                        <p className="text-gray-300 font-medium">{ticket.userTag}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-0.5">ID Discord</p>
                        <p className="text-gray-300 font-mono">{ticket.userId}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-0.5">Canal</p>
                        <p className="text-gray-300 font-mono">{ticket.channelId}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-0.5">Ouvert le</p>
                        <p className="text-gray-300">
                          {new Date(ticket.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      {ticket.closedAt && (
                        <div>
                          <p className="text-gray-600 mb-0.5">Fermé le</p>
                          <p className="text-gray-300">
                            {new Date(ticket.closedAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      )}
                      {ticket.closedBy && (
                        <div>
                          <p className="text-gray-600 mb-0.5">Fermé par</p>
                          <p className="text-gray-300">{ticket.closedBy}</p>
                        </div>
                      )}
                      {ticket.closeReason && (
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-gray-600 mb-0.5">Raison de fermeture</p>
                          <p className="text-gray-300">{ticket.closeReason}</p>
                        </div>
                      )}
                      <div className="col-span-2 md:col-span-3">
                        <p className="text-gray-600 mb-0.5">Sujet complet</p>
                        <p className="text-gray-300 leading-relaxed">{ticket.subject}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {ticketsPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => loadTickets(ticketsPage - 1)}
                disabled={ticketsPage <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm disabled:opacity-30 transition"
              >
                ← Précédent
              </button>
              <span className="text-gray-500 text-sm">
                Page {ticketsPage} / {ticketsPages}
              </span>
              <button
                onClick={() => loadTickets(ticketsPage + 1)}
                disabled={ticketsPage >= ticketsPages}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm disabled:opacity-30 transition"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB — CONFIGURATION
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'config' && config && (
        <div className="space-y-5">

          {/* Activation globale */}
          <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-5 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Système de tickets</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Active ou désactive complètement le système de tickets
              </p>
            </div>
            <Toggle
              enabled={config.enabled}
              onChange={() => updateConfig('enabled', !config.enabled)}
            />
          </div>

          {/* Canaux & rôles */}
          <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Hash size={15} className="text-discord-blurple" />
              Canaux & Rôles
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>📬 Canal de logs</label>
                <select
                  value={config.logChannelId}
                  onChange={e => updateConfig('logChannelId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sélectionner un canal</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
                <p className="text-gray-600 text-xs mt-1">
                  Les transcripts et événements y sont envoyés
                </p>
              </div>

              <div>
                <label className={labelCls}>📁 Catégorie Discord</label>
                <select
                  value={config.categoryId}
                  onChange={e => updateConfig('categoryId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-gray-600 text-xs mt-1">
                  Les canaux de tickets seront créés dans cette catégorie
                </p>
              </div>

              <div>
                <label className={labelCls}>👷 Rôle support</label>
                <select
                  value={config.supportRoleId}
                  onChange={e => updateConfig('supportRoleId', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sélectionner un rôle</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>@{r.name}</option>
                  ))}
                </select>
                <p className="text-gray-600 text-xs mt-1">
                  Accède à tous les tickets automatiquement
                </p>
              </div>

              <div>
                <label className={labelCls}>🔢 Tickets max par utilisateur</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={config.maxPerUser}
                  onChange={e => updateConfig('maxPerUser', parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
                <p className="text-gray-600 text-xs mt-1">
                  Nombre de tickets simultanés autorisés (1–5)
                </p>
              </div>
            </div>
          </div>

          {/* Panneau embed */}
          <div className="bg-[#1a1d21] rounded-xl border border-white/5 p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Eye size={15} className="text-discord-blurple" />
              Apparence du panneau
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Titre de l'embed</label>
                <input
                  type="text"
                  value={config.embedTitle}
                  onChange={e => updateConfig('embedTitle', e.target.value)}
                  placeholder="🎫 Support & Tickets"
                  className={inputCls}
                  maxLength={100}
                />
              </div>

              <div>
                <label className={labelCls}>Couleur de l'embed</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.embedColor}
                    onChange={e => updateConfig('embedColor', e.target.value)}
                    className="h-10 w-14 rounded-lg border border-white/5 cursor-pointer bg-white/5 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={config.embedColor}
                    onChange={e => updateConfig('embedColor', e.target.value)}
                    placeholder="#5865F2"
                    className={clsx(inputCls, 'flex-1')}
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Description de l'embed</label>
              <textarea
                value={config.embedDescription}
                onChange={e => updateConfig('embedDescription', e.target.value)}
                className={clsx(inputCls, 'h-32 resize-none')}
                placeholder="Description du panneau de tickets..."
              />
              <p className="text-gray-600 text-xs mt-1">
                Supporte le Markdown Discord (**, *, `, &gt;)
              </p>
            </div>

            <div>
              <label className={labelCls}>URL de la miniature (optionnel)</label>
              <input
                type="url"
                value={config.embedThumbnail}
                onChange={e => updateConfig('embedThumbnail', e.target.value)}
                placeholder="https://exemple.com/image.png"
                className={inputCls}
              />
            </div>

            {/* Aperçu de l'embed */}
            <div>
              <p className={labelCls}>Aperçu</p>
              <div
                className="rounded-lg p-4 bg-[#2b2d31] border-l-4"
                style={{ borderColor: config.embedColor }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{config.embedTitle || '🎫 Support & Tickets'}</p>
                    <p className="text-gray-300 text-xs mt-1.5 whitespace-pre-wrap leading-relaxed">
                      {config.embedDescription?.slice(0, 200) || 'Description...'}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="bg-[#5865f2] text-white text-xs px-3 py-1 rounded font-medium">
                        📩 Ouvrir un ticket
                      </span>
                      <span className="bg-[#4f545c] text-white text-xs px-3 py-1 rounded font-medium">
                        📋 Mes tickets
                      </span>
                    </div>
                  </div>
                  {config.embedThumbnail && (
                    <img
                      src={config.embedThumbnail}
                      alt="thumb"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              <Save size={14} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS — Fermeture & Suppression
      ══════════════════════════════════════════════════════════════════ */}

      {/* Modal fermeture */}
      {closingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d21] rounded-2xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
              <Lock size={18} className="text-red-400" /> Fermer le ticket
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Le canal Discord sera supprimé et le créateur recevra un DM de confirmation.
            </p>
            <div className="mb-4">
              <label className={labelCls}>Raison (optionnel)</label>
              <input
                type="text"
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                placeholder="Ex : Problème résolu"
                className={inputCls}
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setClosingId(null); setCloseReason(''); }}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition"
              >
                Annuler
              </button>
              <button
                onClick={() => closeTicket(closingId)}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition flex items-center gap-2"
              >
                <Lock size={13} /> Fermer le ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d21] rounded-2xl border border-white/10 p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
              <Trash2 size={18} className="text-red-400" /> Supprimer de l'historique
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              Cette action supprime uniquement l'entrée de l'historique. Irreversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteTicket(deletingId)}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition flex items-center gap-2"
              >
                <Trash2 size={13} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
