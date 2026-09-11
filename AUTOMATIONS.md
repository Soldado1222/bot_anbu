# 🤖 Système d'Automatisations Bot L'ANBU

## 📋 Vue d'ensemble

Le bot synchronise maintenant **toutes les automatisations** depuis le dashboard backend en temps réel (cache de 30 secondes).

## ✅ Fonctionnalités implémentées

### 1. 👋 **Message de Bienvenue**
- Envoyé automatiquement quand un nouveau membre rejoint
- Support des embeds personnalisés
- Variables disponibles :
  - `{user}` : mention du membre
  - `{server}` : nom du serveur
  - `{count}` : nombre total de membres

### 2. 👋 **Message de Départ**
- Envoyé quand un membre quitte le serveur
- Même système de variables que le message de bienvenue

### 3. 🎭 **Autorole**
- Attribution automatique d'un rôle aux nouveaux membres
- Configurable depuis le dashboard

### 4. 🛡️ **Automod**
- **Anti-liens** : Supprime les messages contenant des URLs
- **Anti-caps** : Supprime les messages avec trop de MAJUSCULES (seuil configurable)
- **Logging** : Enregistre les actions dans un canal de logs
- Note : Anti-spam simple (nécessiterait un cache de messages pour être plus robuste)

### 5. ⭐ **Système de Niveaux (XP)**
- Gain d'XP pour chaque message (configurable)
- Cooldown entre les messages (par défaut 60s)
- Message automatique lors d'un level up
- Calcul : 100 XP = 1 niveau
- Variables pour message de level up :
  - `{user}` : mention du membre
  - `{level}` : nouveau niveau atteint

## 🔧 Configuration

### Variables d'environnement requises

**Bot principal** (`.env`) :
```env
BACKEND_URL=http://localhost:3001  # En local
# ou
BACKEND_URL=https://bot-anbu.onrender.com  # En production
```

### Sur Render

**Service Backend** : Déjà configuré
**Service Bot** : Ajouter la variable `BACKEND_URL=https://bot-anbu.onrender.com`

## 🔄 Synchronisation

- **Commandes custom** : Cache 30s, récupérées depuis `/internal/commands`
- **Automatisations** : Cache 30s, récupérées depuis `/internal/automations`
- Les modifications sur le dashboard sont appliquées sous 30 secondes maximum

## 📝 Commandes Custom

Les commandes avec préfixe `!` créées depuis le dashboard fonctionnent désormais :
1. Créer une commande sur le dashboard
2. Attendre max 30 secondes
3. Taper `!nomcommande` dans Discord

Variables disponibles :
- `{user}` : mention de l'utilisateur
- `{server}` : nom du serveur
- `{channel}` : mention du canal

## 🚀 Déploiement

1. Push le code sur GitHub : ✅ **Fait**
2. Render détecte et redéploie automatiquement
3. Ajouter `BACKEND_URL` sur le service bot Render
4. Configurer les automatisations sur le dashboard
5. Profiter ! 🎉

## 🔍 Logs

Le bot affiche dans la console :
- `✅ Message de bienvenue envoyé pour [user]`
- `✅ Rôle automatique attribué à [user]`
- `✅ Message de départ envoyé pour [user]`
- `🛡️ Message supprimé de [user]: [raison]`
- `📝 [user] a exécuté ![commande]`

## 🐛 Debug

Si les automatisations ne fonctionnent pas :
1. Vérifier que `BACKEND_URL` est bien configuré sur Render
2. Vérifier les logs du bot : erreurs de connexion HTTP ?
3. Tester la route manuellement : `curl https://bot-anbu.onrender.com/internal/automations`
4. Vérifier que les automatisations sont bien activées sur le dashboard
