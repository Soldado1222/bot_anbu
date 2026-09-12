import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      localStorage.setItem('auth_token', token);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#111214] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-discord-blurple border-t-transparent mx-auto mb-4" />
        <p className="text-gray-400">Connexion en cours...</p>
      </div>
    </div>
  );
}
