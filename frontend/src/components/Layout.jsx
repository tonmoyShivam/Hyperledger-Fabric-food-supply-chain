import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const TITLES = {
  '/': 'Dashboard',
  '/batches': 'Batches',
  '/register': 'Register Batch',
  '/events/add': 'Add Event',
  '/recalls': 'Recalls',
  '/audit': 'Audit & Verify',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  let title = TITLES[location.pathname] || 'FoodChain';
  if (location.pathname.startsWith('/batches/') && location.pathname !== '/batches') {
    title = 'Batch Detail';
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-area">
        <Navbar title={title} onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
