import { Router } from 'express';
import passport from 'passport';

export function createAuthRoutes() {
  const router = Router();

  // Initier l'authentification Discord
  router.get('/discord', passport.authenticate('discord'));

  // Callback Discord OAuth2
  router.get('/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
      // Rediriger vers le frontend après succès
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
    }
  );

  // Obtenir l'utilisateur actuel
  router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Non authentifié' });
    }
  });

  // Déconnexion
  router.post('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
      }
      res.json({ message: 'Déconnexion réussie' });
    });
  });

  return router;
}
