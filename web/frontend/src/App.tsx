import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { BotStatusProvider } from './contexts/BotStatusContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Loading from './components/Loading';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <BotStatusProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
            </Routes>
          </BotStatusProvider>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
