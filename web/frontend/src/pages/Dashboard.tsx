import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Overview from '../components/dashboard/Overview';
import Servers from '../components/dashboard/Servers';
import Logs from '../components/dashboard/Logs';
import Controls from '../components/dashboard/Controls';
import Settings from '../components/dashboard/Settings';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-discord-notquiteblack overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-discord-notquiteblack to-discord-dark p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/controls" element={<Controls />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
