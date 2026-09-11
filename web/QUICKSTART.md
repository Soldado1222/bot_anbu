# 🚀 Guide de démarrage rapide

## Installation en 5 minutes

### 1️⃣ Configuration Discord OAuth2

1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre bot
3. Menu **OAuth2** → Ajoutez l'URL de redirection :
   ```
   http://localhost:3001/auth/discord/callback
   ```
4. Copiez le **Client Secret**
5. Notez votre **Client ID** (dans General Information)

### 2️⃣ Configuration Backend

```bash
cd web/backend
npm install
cp .env.example .env
```

Éditez le fichier `.env` :
- `DISCORD_TOKEN` : Token de votre bot (depuis le .env principal)
- `CLIENT_ID` : Client ID de votre application Discord
- `DISCORD_CLIENT_SECRET` : Client Secret OAuth2
- `ADMIN_IDS` : Votre ID Discord (activez Mode développeur dans Discord > Clic droit sur votre nom > Copier l'identifiant)
- `SESSION_SECRET` : Une chaîne aléatoire longue

### 3️⃣ Configuration Frontend

```bash
cd web/frontend
npm install
```

### 4️⃣ Démarrage

**Terminal 1 - Backend :**
```bash
cd web/backend
npm run dev
```

**Terminal 2 - Frontend :**
```bash
cd web/frontend
npm run dev
```

### 5️⃣ Accès

Ouvrez votre navigateur sur : **http://localhost:5173**

Cliquez sur "Se connecter avec Discord" et autorisez l'application.

## ✅ Vérification

Si tout fonctionne, vous devriez voir :
- ✅ Dashboard avec statistiques du bot
- ✅ Indicateur "Temps réel actif" (vert) en haut
- ✅ Votre avatar Discord en haut à droite
- ✅ Les serveurs de votre bot dans la page "Serveurs"

## 🐛 Problèmes courants

### Erreur "Bot non connecté"
→ Vérifiez que le `DISCORD_TOKEN` dans `web/backend/.env` est correct

### Erreur OAuth2 callback
→ Vérifiez que l'URL de callback est bien configurée sur Discord Developer Portal

### WebSocket déconnecté
→ Normal si le backend n'est pas démarré, il se reconnecte automatiquement

## 📞 Support

Consultez le fichier `README.md` pour plus de détails !
