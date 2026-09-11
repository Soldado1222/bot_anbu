# 🤖 Bot Discord Communautaire

Bot Discord moderne et complet avec commandes slash pour serveurs communautaires, incluant un système de permissions pour développeurs.

## ✨ Fonctionnalités

### 👥 Commandes Communautaires
- `/ping` - Affiche la latence du bot
- `/info` - Informations détaillées sur le bot
- `/help` - Liste de toutes les commandes disponibles
- `/userinfo [utilisateur]` - Informations sur un utilisateur
- `/serverinfo` - Statistiques complètes du serveur

### 🔧 Commandes Développeur
*Réservées aux développeurs configurés dans `.env`*
- `/reload <commande>` - Recharge une commande sans redémarrer
- `/eval <code>` - Évalue du code JavaScript
- `/status <type> <texte>` - Change le statut du bot
- `/announce <canal> <titre> <message>` - Envoie une annonce stylée

## 📋 Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- Un compte [Discord Developer Portal](https://discord.com/developers/applications)
- npm ou yarn

## 🚀 Installation

### 1. Créer une application Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **"New Application"**
3. Donnez un nom à votre bot
4. Allez dans l'onglet **"Bot"**
5. Cliquez sur **"Add Bot"**
6. Activez ces **Privileged Gateway Intents** :
   - ✅ Server Members Intent
   - ✅ Message Content Intent (si nécessaire)

### 2. Obtenir vos identifiants

#### Token du bot
1. Dans l'onglet **"Bot"**, cliquez sur **"Reset Token"**
2. Copiez le token (vous ne pourrez plus le voir après)

#### Client ID
1. Dans l'onglet **"General Information"**
2. Copiez l'**"Application ID"**

#### Guild ID (ID du serveur)
1. Dans Discord, activez le **Mode Développeur** :
   - Paramètres → Avancés → Mode développeur
2. Faites un clic droit sur votre serveur → **"Copier l'identifiant du serveur"**

#### Dev IDs (IDs des développeurs)
1. Dans Discord, faites un clic droit sur votre profil → **"Copier l'identifiant de l'utilisateur"**
2. Répétez pour chaque développeur autorisé

### 3. Inviter le bot sur votre serveur

Générez un lien d'invitation avec ces permissions :

```
https://discord.com/api/oauth2/authorize?client_id=VOTRE_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Remplacez `VOTRE_CLIENT_ID` par votre Application ID.

**Permissions recommandées :**
- Administrator (simplifié pour débuter)
- Ou manuellement : Send Messages, Embed Links, Read Messages, Use Slash Commands

### 4. Cloner et installer le projet

```bash
# Installer les dépendances
npm install

# Créer le fichier de configuration
cp .env.example .env
```

### 5. Configuration

Éditez le fichier `.env` avec vos identifiants :

```env
DISCORD_TOKEN=votre_token_bot_ici
CLIENT_ID=votre_client_id_ici
GUILD_ID=votre_guild_id_ici
DEV_IDS=123456789012345678,987654321098765432
```

**Note sur DEV_IDS :**
- Séparez les IDs par des virgules (sans espaces)
- Ces utilisateurs auront accès aux commandes développeur

### 6. Compiler le projet

```bash
npm run build
```

### 7. Déployer les commandes slash

```bash
npm run deploy
```

Vous devriez voir :
```
✅ 9 commande(s) déployée(s) avec succès !
```

### 8. Lancer le bot

```bash
# Mode production
npm start

# Mode développement (avec ts-node)
npm run dev
```

Le bot devrait afficher :
```
✅ Bot connecté en tant que VotreBot#1234
📊 Serveurs: 1
👥 Utilisateurs: 42
🔧 2 développeur(s) autorisé(s)
```

## 📁 Structure du Projet

```
discord-bot-communautaire/
├── src/
│   ├── commands/
│   │   ├── community/          # Commandes publiques
│   │   │   ├── ping.ts
│   │   │   ├── info.ts
│   │   │   ├── help.ts
│   │   │   ├── userinfo.ts
│   │   │   └── serverinfo.ts
│   │   └── developer/          # Commandes développeur
│   │       ├── reload.ts
│   │       ├── eval.ts
│   │       ├── status.ts
│   │       └── announce.ts
│   ├── handlers/
│   │   └── commandHandler.ts   # Gestionnaire de commandes
│   ├── config.ts               # Configuration et validation
│   ├── types.ts                # Types TypeScript
│   ├── index.ts                # Point d'entrée principal
│   └── deploy-commands.ts      # Script de déploiement
├── dist/                       # Fichiers compilés (généré)
├── .env                        # Configuration (à créer)
├── .env.example               # Exemple de configuration
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Développement

### Ajouter une nouvelle commande

1. Créez un fichier dans `src/commands/community/` ou `src/commands/developer/`
2. Utilisez ce template :

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('macommande')
    .setDescription('Description de ma commande'),
  
  devOnly: false, // true pour les commandes développeur
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply('Hello World!');
  },
};

export default command;
```

3. Compilez et redéployez :
```bash
npm run build
npm run deploy
```

4. Ou utilisez `/reload macommande` si le bot est déjà lancé

### Scripts disponibles

```bash
npm run build      # Compile le TypeScript
npm start          # Lance le bot (production)
npm run dev        # Lance le bot (développement)
npm run deploy     # Déploie les commandes slash
npm run watch      # Compile en mode watch
```

## 🔒 Sécurité

- ⚠️ **Ne partagez JAMAIS votre fichier `.env`**
- ⚠️ **Ne commitez JAMAIS votre token Discord**
- ✅ Le fichier `.env` est ignoré par git
- ✅ Les commandes développeur sont protégées par vérification d'ID

## 🐛 Dépannage

### Le bot ne se connecte pas
- Vérifiez que votre `DISCORD_TOKEN` est correct
- Assurez-vous que le bot est bien invité sur votre serveur

### Les commandes ne s'affichent pas
- Exécutez `npm run deploy` pour déployer les commandes
- Attendez quelques minutes (propagation Discord)
- Réinvitez le bot avec le scope `applications.commands`

### Erreur "Missing Access"
- Vérifiez que le bot a les permissions nécessaires
- Vérifiez que le `GUILD_ID` est correct

### Les commandes développeur ne fonctionnent pas
- Vérifiez que votre ID Discord est dans `DEV_IDS`
- Les IDs doivent être séparés par des virgules sans espaces

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📧 Support

Pour toute question ou problème, créez une issue sur le dépôt GitHub.

---

Fait avec ❤️ pour la communauté Discord
