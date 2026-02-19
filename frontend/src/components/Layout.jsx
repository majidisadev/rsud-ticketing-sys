import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationMenu from './NotificationMenu';
import ChangePasswordDialog from './ChangePasswordDialog';
import { Menu, X, FileText, Users, BarChart3, LogOut, User, CalendarDays, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'teknisi_simrs' || user?.role === 'teknisi_ipsrs';

  const adminMenu = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/tickets', label: 'Semua Tiket', icon: FileText },
    { path: '/admin/all-activities', label: 'Semua Aktivitas', icon: CalendarDays },
    { path: '/admin/users', label: 'Manajemen User', icon: Users }
  ];

  const technicianMenu = [
    { path: '/technician/my-tasks', label: 'Tugas Saya', icon: FileText },
    { path: '/technician/all-tasks', label: 'Semua Tugas', icon: FileText },
    { path: '/technician/my-activities', label: 'Aktivitas Saya', icon: CalendarDays }
  ];

  const menu = isAdmin ? adminMenu : technicianMenu;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <Link to="/" className="flex items-center gap-2 ml-2 lg:ml-0">
                <img 
                  src={`${import.meta.env.BASE_URL}logo192.png`} 
                  alt="RSUD Logo" 
                  className="h-8 w-8 object-contain"
                />
                <h1 className="text-xl font-bold text-gray-800">Ticketing RSUD</h1>
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              {menu.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.path
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Side - Notifications and User Menu */}
            <div className="flex items-center gap-2">
              {isTechnician && <NotificationMenu />}
              
              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline">{user?.fullName}</span>
                  <span className="hidden lg:inline text-xs text-gray-500">({user?.role})</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-2">
                    <div className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <p className="font-medium">{user?.fullName}</p>
                    </div>
                    {isTechnician && (
                      <button
                        onClick={() => setChangePasswordOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                        Ganti Password
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-2 space-y-1">
              {menu.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.path
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-gray-200 mt-2">
                <div className="px-4 py-2 text-sm text-gray-600">
                  {user?.fullName}
                </div>
                {isTechnician && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setChangePasswordOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <KeyRound className="w-5 h-5" />
                    Ganti Password
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
};

export default Layout;
