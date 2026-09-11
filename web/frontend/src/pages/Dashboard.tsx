import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Overview from '../components/dashboard/Overview';
import Servers from '../components/dashboard/Servers';
import Logs from '../components/dashboard/Logs';
import Controls from '../components/dashboard/Controls';
import Commands from '../components/dashboard/Commands';
import Automations from '../components/dashboard/Automations';
import Settings from '../components/dashboard/Settings';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-[#111214] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/commands" element={<Commands />} />
            <Route path="/automations" element={<Automations />} />
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
