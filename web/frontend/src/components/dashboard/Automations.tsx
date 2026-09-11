import { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import { Zap, UserPlus, UserMinus, Shield, TrendingUp, Save, Send, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

interface AutomationConfig {
  welcome: { enabled: boolean; channelId: string; message: string; embedEnabled: boolean; embedColor: string; embedTitle: string };
  goodbye: { enabled: boolean; channelId: string; message: string };
  autorole: { enabled: boolean; roleId: string };
  automod: { enabled: boolean; antiSpam: boolean; antiLinks: boolean; antiCaps: boolean; capsThreshold: number; logChannelId: string };
  levelSystem: { enabled: boolean; channelId: string; message: string; xpPerMessage: number; xpCooldown: number };
}

interface Channel { id: string; name: string }
interface Role { id: string; name: string; color: string }

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={clsx('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', enabled ? 'bg-discord-blurple' : 'bg-gray-700')}>
      <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow', enabled ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

function Section({ icon: Icon, title, color, enabled, onToggle, children }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx('bg-[#1a1d21] rounded-xl border transition-all', enabled ? 'border-white/10' : 'border-white/5')}>
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{enabled ? 'Activé' : 'Désactivé'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle enabled={enabled} onChange={onToggle} />
          <button onClick={ev => { ev.stopPropagation(); setOpen(!open); }} className="text-gray-600 hover:text-gray-400 transition">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {open && <div className="px-4 pb-4 border-t border-white/5 pt-4">{children}</div>}
    </div>
  );
}

export default function Automations() {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get('/api/automations'),
      axios.get('/api/automations/guild/channels'),
      axios.get('/api/automations/guild/roles'),
    ]).then(([cfg, chs, rls]) => {
      setConfig(cfg.data);
      setChannels(chs.data);
      setRoles(rls.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async (section: string, data: any) => {
    setSaving(section);
    try {
      await axios.patch(`/api/automations/${section}`, data);
      setTestMsg(`✅ ${section} sauvegardé !`);
      setTimeout(() => setTestMsg(null), 3000);
    } catch { setTestMsg('❌ Erreur lors de la sauvegarde'); }
    finally { setSaving(null); }
  };

  const testWelcome = async () => {
    try {
      await axios.post('/api/automations/welcome/test');
      setTestMsg('✅ Message de test envoyé !');
    } catch { setTestMsg('❌ Erreur : configurez d\'abord le canal'); }
    setTimeout(() => setTestMsg(null), 3000);
  };

  const update = (section: keyof AutomationConfig, field: string, value: any) => {
    setConfig(prev => prev ? { ...prev, [section]: { ...prev[section], [field]: value } } : prev);
  };

  if (loading || !config) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-discord-blurple border-t-transparent" />
    </div>
  );

  const inputCls = "w-full bg-white/5 text-white text-sm px-3 py-2.5 rounded-lg border border-white/5 focus:border-discord-blurple/50 outline-none placeholder-gray-600";
  const labelCls = "block text-gray-400 text-sm mb-1.5";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={22} className="text-discord-yellow" /> Automatisations
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Configurez les actions automatiques de votre bot</p>
      </div>

      {testMsg && (
        <div className={clsx('px-4 py-3 rounded-xl text-sm font-medium', testMsg.startsWith('✅') ? 'bg-discord-green/10 text-discord-green border border-discord-green/20' : 'bg-discord-red/10 text-discord-red border border-discord-red/20')}>
          {testMsg}
        </div>
      )}

      {/* Welcome */}
      <Section icon={UserPlus} title="Message de bienvenue" color="bg-discord-green/20" enabled={config.welcome.enabled} onToggle={() => update('welcome', 'enabled', !config.welcome.enabled)}>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Canal de bienvenue</label>
            <select value={config.welcome.channelId} onChange={e => update('welcome', 'channelId', e.target.value)} className={inputCls}>
              <option value="">Sélectionner un canal</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <textarea value={config.welcome.message} onChange={e => update('welcome', 'message', e.target.value)} className={clsx(inputCls, 'h-20 resize-none')} />
            <p className="text-gray-600 text-xs mt-1">Variables : <code className="text-discord-blurple">{'{user}'}</code> <code className="text-discord-blurple">{'{server}'}</code> <code className="text-discord-blurple">{'{count}'}</code></p>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white text-sm font-medium">Embed</p>
              <p className="text-gray-500 text-xs">Afficher en tant qu'embed Discord</p>
            </div>
            <Toggle enabled={config.welcome.embedEnabled} onChange={() => update('welcome', 'embedEnabled', !config.welcome.embedEnabled)} />
          </div>
          {config.welcome.embedEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Titre de l'embed</label>
                <input type="text" value={config.welcome.embedTitle} onChange={e => update('welcome', 'embedTitle', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Couleur</label>
                <input type="color" value={config.welcome.embedColor} onChange={e => update('welcome', 'embedColor', e.target.value)} className="w-full h-10 rounded-lg border border-white/5 cursor-pointer bg-white/5" />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => save('welcome', config.welcome)} disabled={saving === 'welcome'} className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
              <Save size={14} /> {saving === 'welcome' ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={testWelcome} className="flex items-center gap-2 bg-discord-green/10 hover:bg-discord-green/20 text-discord-green px-4 py-2 rounded-lg text-sm font-semibold transition border border-discord-green/20">
              <Send size={14} /> Tester
            </button>
          </div>
        </div>
      </Section>

      {/* Goodbye */}
      <Section icon={UserMinus} title="Message d'au revoir" color="bg-discord-red/20" enabled={config.goodbye.enabled} onToggle={() => update('goodbye', 'enabled', !config.goodbye.enabled)}>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Canal</label>
            <select value={config.goodbye.channelId} onChange={e => update('goodbye', 'channelId', e.target.value)} className={inputCls}>
              <option value="">Sélectionner un canal</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <textarea value={config.goodbye.message} onChange={e => update('goodbye', 'message', e.target.value)} className={clsx(inputCls, 'h-20 resize-none')} />
          </div>
          <button onClick={() => save('goodbye', config.goodbye)} disabled={saving === 'goodbye'} className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            <Save size={14} /> {saving === 'goodbye' ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </Section>

      {/* Autorole */}
      <Section icon={UserPlus} title="Rôle automatique" color="bg-discord-blurple/20" enabled={config.autorole.enabled} onToggle={() => update('autorole', 'enabled', !config.autorole.enabled)}>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Rôle à attribuer</label>
            <select value={config.autorole.roleId} onChange={e => update('autorole', 'roleId', e.target.value)} className={inputCls}>
              <option value="">Sélectionner un rôle</option>
              {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
            </select>
          </div>
          <button onClick={() => save('autorole', config.autorole)} disabled={saving === 'autorole'} className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            <Save size={14} /> {saving === 'autorole' ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </Section>

      {/* Automod */}
      <Section icon={Shield} title="Modération automatique" color="bg-discord-yellow/20" enabled={config.automod.enabled} onToggle={() => update('automod', 'enabled', !config.automod.enabled)}>
        <div className="space-y-3">
          {[
            { field: 'antiSpam', label: 'Anti-Spam', desc: 'Supprime les messages en double' },
            { field: 'antiLinks', label: 'Anti-Liens', desc: 'Supprime les liens non autorisés' },
            { field: 'antiCaps', label: 'Anti-Majuscules', desc: 'Limite les messages en majuscules' },
          ].map(opt => (
            <div key={opt.field} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">{opt.label}</p>
                <p className="text-gray-500 text-xs">{opt.desc}</p>
              </div>
              <Toggle enabled={(config.automod as any)[opt.field]} onChange={() => update('automod', opt.field, !(config.automod as any)[opt.field])} />
            </div>
          ))}
          {config.automod.antiCaps && (
            <div>
              <label className={labelCls}>Seuil majuscules ({config.automod.capsThreshold}%)</label>
              <input type="range" min="50" max="100" value={config.automod.capsThreshold} onChange={e => update('automod', 'capsThreshold', parseInt(e.target.value))} className="w-full accent-discord-blurple" />
            </div>
          )}
          <div>
            <label className={labelCls}>Canal de logs</label>
            <select value={config.automod.logChannelId} onChange={e => update('automod', 'logChannelId', e.target.value)} className={inputCls}>
              <option value="">Sélectionner un canal</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <button onClick={() => save('automod', config.automod)} disabled={saving === 'automod'} className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            <Save size={14} /> {saving === 'automod' ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </Section>

      {/* Niveau */}
      <Section icon={TrendingUp} title="Système de niveaux" color="bg-discord-fuchsia/20" enabled={config.levelSystem.enabled} onToggle={() => update('levelSystem', 'enabled', !config.levelSystem.enabled)}>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Canal d'annonce</label>
            <select value={config.levelSystem.channelId} onChange={e => update('levelSystem', 'channelId', e.target.value)} className={inputCls}>
              <option value="">Sélectionner un canal</option>
              {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Message de niveau</label>
            <textarea value={config.levelSystem.message} onChange={e => update('levelSystem', 'message', e.target.value)} className={clsx(inputCls, 'h-16 resize-none')} />
            <p className="text-gray-600 text-xs mt-1">Variables : <code className="text-discord-blurple">{'{user}'}</code> <code className="text-discord-blurple">{'{level}'}</code> <code className="text-discord-blurple">{'{xp}'}</code></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>XP par message</label>
              <input type="number" value={config.levelSystem.xpPerMessage} onChange={e => update('levelSystem', 'xpPerMessage', parseInt(e.target.value))} className={inputCls} min="1" max="100" />
            </div>
            <div>
              <label className={labelCls}>Cooldown (secondes)</label>
              <input type="number" value={config.levelSystem.xpCooldown} onChange={e => update('levelSystem', 'xpCooldown', parseInt(e.target.value))} className={inputCls} min="0" max="3600" />
            </div>
          </div>
          <button onClick={() => save('levelSystem', config.levelSystem)} disabled={saving === 'levelSystem'} className="flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            <Save size={14} /> {saving === 'levelSystem' ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </Section>
    </div>
  );
}
