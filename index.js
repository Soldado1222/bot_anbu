// Fichier de redirection pour l'hébergement
// Compile et lance le bot TypeScript

const { exec } = require('child_process');
const path = require('path');

console.log('🔄 Compilation du projet TypeScript...');

// Compiler le projet
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erreur de compilation:', error);
    return;
  }
  
  console.log(stdout);
  if (stderr) console.error(stderr);
  
  console.log('✅ Compilation réussie, démarrage du bot...');
  
  // Lancer le bot compilé
  require('./dist/index.js');
});
