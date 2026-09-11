# 🎮 Dashboard Bot Discord

Dashboard web moderne et épuré en React/TypeScript pour gérer votre bot Discord à distance.

## ✨ Fonctionnalités

### 🔐 Authentification
- Connexion via Discord OAuth2
- Gestion des rôles (Admin/Utilisateur)
- Session sécurisée

### 📊 Dashboard
- **Vue d'ensemble** : Statistiques en temps réel (serveurs, utilisateurs, canaux, ping)
- **Serveurs** : Liste et détails des serveurs où le bot est présent
- **Logs** : Surveillance en temps réel des événements (messages, arrivées/départs)
- **Contrôles** : 
  - Envoi de messages personnalisés
  - Modification du statut du bot
  - Redémarrage du bot (admin uniquement)
- **Paramètres** : Personnalisation et informations du compte

### 🔄 Temps réel
- WebSocket pour les mises à jour instantanées
- Graphiques de latence en direct
- Notifications d'événements

## 🚀 Installation

### Prérequis
- Node.js >= 18.0.0
- npm ou yarn
- Bot Discord configuré

### Backend

```bash
cd web/backend
npm install

# Créer le fichier .env (voir configuration ci-dessous)
cp .env.example .env

# Démarrer le serveur
npm run dev
```

Le backend sera accessible sur `http://localhost:3001`

### Frontend

```bash
cd web/frontend
npm install

# Démarrer l'application
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## ⚙️ Configuration

### Configuration Discord OAuth2

1. Accédez au [Discord Developer Portal](https://discord.com/developers/applications)
2. Sélectionnez votre application bot
3. Dans la section **OAuth2** :
   - Ajoutez l'URL de redirection : `http://localhost:3001/auth/discord/callback`
   - Copiez le **Client Secret**
4. Notez votre **Client ID** (dans General Information)

### Configuration Backend (.env)

Créez le fichier `web/backend/.env` avec ces variables :

```env
# Serveur
PORT=3001
NODE_ENV=development

# Bot Discord (copiez depuis votre fichier .env principal)
DISCORD_TOKEN=votre_token_bot
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id

# OAuth2 Discord
DISCORD_CLIENT_SECRET=votre_client_secret
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback

# Session
SESSION_SECRET=une_cle_secrete_aleatoire_longue

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Administrateurs (IDs Discord séparés par des virgules)
ADMIN_IDS=votre_id_discord,id_autre_admin
```

### Obtenir votre ID Discord

1. Activez le mode développeur dans Discord (Paramètres > Avancés > Mode développeur)
2. Clic droit sur votre nom d'utilisateur > Copier l'identifiant

## 📁 Structure du projet

```
web/
├── backend/              # API Express + WebSocket
│   ├── src/
│   │   ├── routes/      # Routes API (auth, bot, stats)
│   │   ├── server.ts    # Configuration serveur
│   │   └── websocket.ts # Gestion WebSocket
│   └── package.json
│
└── frontend/            # Application React
    ├── src/
    │   ├── components/  # Composants réutilisables
    │   ├── contexts/    # Contextes React (Auth, WebSocket)
    │   ├── pages/       # Pages (Login, Dashboard)
    │   └── main.tsx     # Point d'entrée
    └── package.json
```

## 🎨 Technologies utilisées

### Backend
- **Express** : Framework web
- **Discord.js** : Interaction avec l'API Discord
- **Passport** : Authentification OAuth2
- **WebSocket (ws)** : Communication temps réel
- **TypeScript** : Typage statique

### Frontend
- **React 18** : Framework UI
- **Vite** : Build tool moderne
- **TailwindCSS** : Framework CSS utilitaire
- **React Router** : Navigation
- **Recharts** : Graphiques interactifs
- **Axios** : Requêtes HTTP
- **Lucide React** : Icônes modernes

## 🔒 Sécurité

- Authentification via Discord OAuth2
- Sessions sécurisées avec express-session
- Middleware de vérification des permissions
- CORS configuré pour le frontend uniquement
- Variables d'environnement pour les secrets

## 🎯 Utilisation

### Connexion

1. Accédez à `http://localhost:5173`
2. Cliquez sur "Se connecter avec Discord"
3. Autorisez l'application à accéder à vos informations Discord
4. Vous serez redirigé vers le dashboard

### Fonctionnalités Admin

Les utilisateurs listés dans `ADMIN_IDS` peuvent :
- Modifier le statut du bot
- Envoyer des messages depuis le bot
- Redémarrer le bot

### Fonctionnalités Utilisateur

Tous les utilisateurs connectés peuvent :
- Consulter les statistiques du bot
- Voir les serveurs
- Consulter les logs en temps réel
- Personnaliser leur dashboard

## 🐛 Dépannage

### Le bot ne se connecte pas
- Vérifiez que `DISCORD_TOKEN` est correct dans le `.env`
- Assurez-vous que le bot principal n'est pas déjà en cours d'exécution

### Erreur OAuth2
- Vérifiez que l'URL de callback est correctement configurée sur Discord
- Vérifiez que `DISCORD_CLIENT_SECRET` est correct

### WebSocket déconnecté
- Le WebSocket se reconnecte automatiquement après 5 secondes
- Vérifiez que le backend est bien démarré

## 📦 Déploiement en production

### Backend

```bash
cd web/backend
npm run build
npm start
```

### Frontend

```bash
cd web/frontend
npm run build
# Les fichiers compilés sont dans dist/
```

### Variables d'environnement production

N'oubliez pas de mettre à jour :
- `NODE_ENV=production`
- `FRONTEND_URL` avec votre domaine
- `DISCORD_CALLBACK_URL` avec votre domaine
- Utilisez HTTPS en production
- Configurez `SESSION_SECRET` avec une vraie clé aléatoire longue

## 🤝 Contribution

Ce dashboard est conçu pour être facilement extensible. Pour ajouter des fonctionnalités :

1. **Backend** : Ajoutez des routes dans `backend/src/routes/`
2. **Frontend** : Créez des composants dans `frontend/src/components/`
3. **WebSocket** : Ajoutez des événements dans `backend/src/websocket.ts`

## 📝 Licence

MIT

## 🎉 Auteur

Dashboard créé pour la gestion du bot Discord communautaire L'ANBU.
