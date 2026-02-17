import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, LogOut, Home, Shield } from 'lucide-react';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-slate-900">Trinity Admin</h1>
              <div className="flex gap-1">
                <Link
                  to="/admin/inventory-sync"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/inventory-sync')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Inventory Sync
                </Link>
                <Link
                  to="/admin/carfax-management"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/carfax-management')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  CARFAX Management
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user?.email}</span>
              <Link
                to="/"
                className="text-slate-600 hover:text-slate-900 transition-colors"
                title="Back to Website"
              >
                <Home className="w-5 h-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
