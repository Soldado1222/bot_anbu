import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lanbu-jwt-secret-change-me';
const JWT_EXPIRY = '7d';

export function createAuthRoutes() {
  const router = Router();

  // Initier l'authentification Discord
  router.get('/discord', passport.authenticate('discord'));

  // Callback Discord OAuth2
  router.get('/discord/callback',
    passport.authenticate('discord', { failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed` }),
    (req, res) => {
      // Générer un JWT avec les infos user
      const user = req.user as any;
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      // Rediriger vers le frontend avec le token dans l'URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
  );

  // Obtenir l'utilisateur actuel (via JWT header)
  router.get('/user', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    try {
      const user = jwt.verify(token, JWT_SECRET);
      res.json(user);
    } catch {
      res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  });

  // Déconnexion (côté client on supprime juste le token)
  router.post('/logout', (req, res) => {
    res.json({ message: 'Déconnexion réussie' });
  });

  return router;
}
