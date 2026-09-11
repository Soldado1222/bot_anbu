# 🚀 Déploiement Rapide - 10 minutes

## Étape 1 : Préparer le code (2 min)

```bash
# Vérifier que tout est à jour
cd web/frontend
npm run build  # Test du build

cd ../backend
npm run build  # Test du build
```

Si les builds fonctionnent, continuez !

## Étape 2 : Pousser sur GitHub (1 min)

```bash
cd ../..  # Retour à la racine de L'ANBU
git add .
git commit -m "Add web dashboard"
git push origin main
```

## Étape 3 : Déployer le Backend sur Render (4 min)

1. Allez sur https://render.com
2. Connectez-vous avec GitHub
3. Cliquez **"New +"** → **"Web Service"**
4. Sélectionnez votre repo **L'ANBU**
5. Configuration :
   ```
   Name: bot-dashboard-backend
   Root Directory: web/backend
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```
6. **Variables d'environnement** (cliquez "Add Environment Variable") :
   ```
   NODE_ENV=production
   DISCORD_TOKEN=(votre token)
   CLIENT_ID=1547204371442569226
   GUILD_ID=1491909517435342948
   DISCORD_CLIENT_SECRET=(obtenir sur Discord Developer Portal)
   SESSION_SECRET=(générer une clé aléatoire longue)
   ADMIN_IDS=779389656172855347,532185803984732163
   ```
7. Cliquez **"Create Web Service"**
8. **Notez l'URL** qui apparaît (ex: `https://bot-dashboard-backend.onrender.com`)

## Étape 4 : Configurer Discord OAuth2 (2 min)

1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre bot
3. Menu **OAuth2** → **Redirects**
4. Ajoutez :
   ```
   https://votre-url-render.onrender.com/auth/discord/callback
   ```
5. **Save Changes**
6. Copiez le **Client Secret** (si pas déjà fait)
7. Retournez sur Render et mettez à jour les variables :
   ```
   DISCORD_CLIENT_SECRET=(le secret copié)
   DISCORD_CALLBACK_URL=https://votre-url-render.onrender.com/auth/discord/callback
   ```

## Étape 5 : Déployer le Frontend sur Netlify (3 min)

1. Allez sur https://app.netlify.com
2. **"Add new site"** → **"Import an existing project"**
3. Connectez GitHub et sélectionnez **L'ANBU**
4. Configuration :
   ```
   Base directory: web/frontend
   Build command: npm run build
   Publish directory: web/frontend/build
   ```
5. **Variables d'environnement** :
   ```
   VITE_API_URL=https://votre-url-render.onrender.com
   ```
6. **Deploy site**
7. **Notez l'URL Netlify** (ex: `https://votre-site.netlify.app`)

## Étape 6 : Finaliser (1 min)

1. Retournez sur **Render**
2. Ajoutez la variable d'environnement :
   ```
   FRONTEND_URL=https://votre-site.netlify.app
   ```
3. Le service redémarre automatiquement

## ✅ Test

1. Accédez à votre site Netlify
2. Cliquez "Se connecter avec Discord"
3. Vous devriez voir le dashboard ! 🎉

## 🐛 Si ça ne marche pas

### Erreur OAuth2
- Vérifiez que les URLs de callback sont IDENTIQUES entre Discord et Render
- Vérifiez que `DISCORD_CLIENT_SECRET` est correct

### CORS Error
- Vérifiez que `FRONTEND_URL` sur Render = votre URL Netlify exacte

### Bot ne se connecte pas
- Vérifiez `DISCORD_TOKEN` sur Render

## 💡 Astuce : Garder le backend actif 24/7

Le plan gratuit de Render met le service en veille après 15 min.

**Solution :** Utilisez UptimeRobot (gratuit)
1. https://uptimerobot.com
2. Créez un monitor HTTP vers : `https://votre-backend.onrender.com/health`
3. Interval : 5 minutes
4. Votre backend reste actif ! 🚀

## 🎉 C'est fait !

Votre dashboard est maintenant en ligne et accessible depuis n'importe où !

**URLs à sauvegarder :**
- Frontend : `https://votre-site.netlify.app`
- Backend : `https://votre-backend.onrender.com`

---

Pour des explications détaillées, consultez `DEPLOYMENT.md`
