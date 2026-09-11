# 🚀 Guide de déploiement

## Architecture du déploiement

Votre application a 2 parties :
- **Frontend (React)** → Netlify ✅
- **Backend (Express + Bot)** → Render/Railway/Heroku 🔧

## 📦 Option 1 : Netlify + Render (Recommandé)

### Partie 1 : Déployer le Backend sur Render

#### 1. Préparation du code

Créez un fichier de démarrage pour Render :

```bash
# Déjà fait ci-dessous dans ce guide
```

#### 2. Inscription sur Render

1. Allez sur https://render.com
2. Créez un compte (gratuit)
3. Cliquez sur "New +" → "Web Service"

#### 3. Configuration

- **Repository** : Connectez votre repo GitHub
- **Name** : `bot-dashboard-backend`
- **Root Directory** : `web/backend`
- **Environment** : `Node`
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`
- **Plan** : Free

#### 4. Variables d'environnement

Ajoutez ces variables dans Render :

```
NODE_ENV=production
PORT=3001
DISCORD_TOKEN=votre_token
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id
DISCORD_CLIENT_SECRET=votre_secret_oauth
SESSION_SECRET=une_longue_cle_aleatoire
ADMIN_IDS=vos_ids_discord
```

**⚠️ IMPORTANT** : Une fois déployé, notez l'URL de votre backend (ex: `https://bot-dashboard-backend.onrender.com`)

Vous devrez ensuite :
1. Mettre à jour `DISCORD_CALLBACK_URL` sur Render vers : `https://votre-backend.onrender.com/auth/discord/callback`
2. Ajouter cette URL dans Discord Developer Portal > OAuth2 > Redirects

### Partie 2 : Déployer le Frontend sur Netlify

#### 1. Configuration du build

Le fichier `netlify.toml` est déjà créé (voir ci-dessous).

#### 2. Build local (optionnel - pour tester)

```bash
cd web/frontend
npm run build
```

#### 3. Déploiement sur Netlify

**Option A : Via l'interface web (plus simple)**

1. Allez sur https://app.netlify.com
2. Cliquez sur "Add new site" → "Import an existing project"
3. Connectez votre repo GitHub
4. Configuration :
   - **Base directory** : `web/frontend`
   - **Build command** : `npm run build`
   - **Publish directory** : `web/frontend/build`
5. Cliquez sur "Deploy site"

**Option B : Via Netlify CLI**

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Se connecter
netlify login

# Dans le dossier frontend
cd web/frontend

# Déployer
netlify deploy --prod
```

#### 4. Variables d'environnement

Dans Netlify Dashboard :
1. Site settings → Environment variables
2. Ajoutez :
   ```
   VITE_API_URL=https://votre-backend.onrender.com
   ```

#### 5. Configuration CORS

Mettez à jour `FRONTEND_URL` dans les variables d'environnement de Render avec votre URL Netlify :
```
FRONTEND_URL=https://votre-site.netlify.app
```

#### 6. Redirection OAuth

Dans Discord Developer Portal :
1. Allez dans OAuth2
2. Ajoutez l'URL de callback de production :
   ```
   https://votre-backend.onrender.com/auth/discord/callback
   ```
3. Mettez à jour `DISCORD_CALLBACK_URL` sur Render avec cette même URL

## 📦 Option 2 : Tout sur Render

Si vous préférez tout héberger sur Render :

### Backend (Web Service)
- Suivez les étapes ci-dessus

### Frontend (Static Site)
1. New → Static Site
2. **Build Command** : `cd web/frontend && npm install && npm run build`
3. **Publish Directory** : `web/frontend/build`
4. Variables d'environnement : même chose que Netlify

## 📦 Option 3 : Railway (Alternative)

Railway est aussi excellent et plus simple :

1. Allez sur https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionnez votre repo
4. Railway détecte automatiquement le Node.js
5. Ajoutez les variables d'environnement
6. Déployez !

## 🔧 Checklist avant le déploiement

- [ ] Code poussé sur GitHub
- [ ] `.env` dans `.gitignore` (ne JAMAIS commit les secrets)
- [ ] Variables d'environnement configurées sur le service d'hébergement
- [ ] Discord OAuth2 URLs de callback mises à jour
- [ ] CORS configuré avec les bonnes URLs
- [ ] SESSION_SECRET changé (pas celui par défaut)
- [ ] Build teste en local (`npm run build`)

## 🐛 Problèmes courants

### Le bot ne se connecte pas
→ Vérifiez que `DISCORD_TOKEN` est correct dans les variables d'environnement

### OAuth2 ne fonctionne pas
→ Vérifiez que les URLs de callback sont identiques entre :
- Discord Developer Portal
- Variable `DISCORD_CALLBACK_URL` sur le backend
- Et qu'elles utilisent HTTPS en production

### CORS errors
→ Vérifiez que `FRONTEND_URL` sur le backend correspond à l'URL Netlify

### WebSocket ne fonctionne pas
→ Certains hébergeurs gratuits peuvent avoir des limitations. Render supporte WebSocket.

## 💰 Coûts

### Gratuit
- **Netlify** : 100GB bande passante/mois
- **Render** : 750h/mois (suffisant pour 1 service 24/7)
- **Railway** : $5 de crédit gratuit/mois

### Limitations du plan gratuit Render
- Le service s'endort après 15 min d'inactivité
- Redémarre au premier accès (délai de ~30 secondes)
- Solution : utiliser un service de ping (UptimeRobot) pour garder le service actif

## 📊 Monitoring

Pour garder votre backend actif 24/7 gratuitement :

1. Inscrivez-vous sur https://uptimerobot.com
2. Créez un monitor :
   - Type : HTTP(s)
   - URL : `https://votre-backend.onrender.com/health`
   - Interval : 5 minutes
3. Votre backend restera actif !

## 🔐 Sécurité en production

1. **Changez `SESSION_SECRET`** vers une vraie clé aléatoire longue
2. **Utilisez HTTPS** partout (automatique sur Netlify/Render)
3. **Ne commitez JAMAIS** les fichiers `.env`
4. **Limitez les ADMIN_IDS** aux utilisateurs de confiance

## 📝 Commandes de déploiement rapide

```bash
# Mettre à jour le code
git add .
git commit -m "Update dashboard"
git push origin main

# Netlify et Render se mettent à jour automatiquement !
```

## ✅ Test après déploiement

1. Accédez à votre site Netlify
2. Cliquez sur "Se connecter avec Discord"
3. Autorisez l'application
4. Vérifiez que le dashboard affiche les stats du bot
5. Testez l'envoi d'un message (si vous êtes admin)

---

Besoin d'aide ? Consultez les documentations :
- [Netlify Docs](https://docs.netlify.com/)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app/)
