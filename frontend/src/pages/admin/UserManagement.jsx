import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../../config/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { UserPlus, Edit, Power, X, CheckCircle, XCircle } from 'lucide-react';
import { useAdminPageAnimation, useStaggerListAnimation, prefersReducedMotion } from '../../hooks/useAdminPageAnimation';
import { set, animate } from 'animejs';

const UserManagement = () => {
  const containerRef = useRef(null);
  const tableCardRef = useRef(null);
  const panelBackdropRef = useRef(null);
  const panelRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [ipsrsEnabled, setIpsrsEnabled] = useState(false);
  const [togglingIpsrs, setTogglingIpsrs] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'teknisi_simrs',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
    fetchIpsrsStatus();
  }, []);

  const fetchIpsrsStatus = async () => {
    try {
      const res = await api.get('/settings/public/ipsrs-enabled');
      setIpsrsEnabled(res.data.ipsrsEnabled);
    } catch (error) {
      console.error('Fetch IPSRS status error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - remove password if empty when editing
      const dataToSend = { ...formData };
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }
      
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, dataToSend);
      } else {
        await api.post('/users', dataToSend);
      }
      setShowPanel(false);
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        role: 'teknisi_simrs',
        isActive: true
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      isActive: user.isActive
    });
    setShowPanel(true);
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleToggleIpsrs = async () => {
    setTogglingIpsrs(true);
    try {
      await api.put('/settings/ipsrs_enabled', { value: !ipsrsEnabled });
      setIpsrsEnabled(!ipsrsEnabled);
      alert(`IPSRS telah ${!ipsrsEnabled ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (error) {
      console.error('Toggle IPSRS error:', error);
      alert(error.response?.data?.message || 'Terjadi kesalahan saat mengubah status IPSRS');
    } finally {
      setTogglingIpsrs(false);
    }
  };

  useAdminPageAnimation({
    containerRef,
    cardRefs: [tableCardRef],
    enabled: !loading
  });
  useStaggerListAnimation(tableCardRef, 'tr[data-user-row]', !loading && users.length > 0);

  useEffect(() => {
    if (!showPanel || prefersReducedMotion()) return;
    const backdrop = panelBackdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;
    set(backdrop, { opacity: 0 });
    set(panel, { x: -448 });
    animate(backdrop, { opacity: { to: 1 } }, { duration: 200 });
    animate(panel, { x: { to: 0 } }, { duration: 320, ease: 'outExpo' });
  }, [showPanel]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="status" aria-live="polite" aria-label="Memuat daftar user">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" aria-hidden="true" />
        <p className="text-sm text-gray-600">Memuat data user…</p>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="space-y-5 sm:space-y-6" aria-label="Manajemen user">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Manajemen User</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleToggleIpsrs}
            disabled={togglingIpsrs}
            variant={ipsrsEnabled ? "default" : "outline"}
            className={ipsrsEnabled ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500" : ""}
            title={ipsrsEnabled ? "IPSRS Aktif - Klik untuk menonaktifkan" : "IPSRS Nonaktif - Klik untuk mengaktifkan"}
            aria-label={ipsrsEnabled ? "IPSRS aktif. Klik untuk menonaktifkan" : "IPSRS nonaktif. Klik untuk mengaktifkan"}
            aria-pressed={ipsrsEnabled}
          >
            {ipsrsEnabled ? (
              <CheckCircle className="w-4 h-4 mr-2" aria-hidden />
            ) : (
              <XCircle className="w-4 h-4 mr-2" aria-hidden />
            )}
            <span className="hidden sm:inline">IPSRS: {ipsrsEnabled ? 'Aktif' : 'Nonaktif'}</span>
            <span className="sm:hidden">{ipsrsEnabled ? 'IPSRS On' : 'IPSRS Off'}</span>
          </Button>
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                fullName: '',
                phoneNumber: '',
                role: 'teknisi_simrs',
                isActive: true
              });
              setShowPanel(true);
            }}
            aria-label="Tambah user baru"
          >
            <UserPlus className="w-4 h-4 mr-2" aria-hidden />
            Tambah User
          </Button>
        </div>
      </header>

      <Card ref={tableCardRef} className="shadow-sm border-gray-200/80 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Username</TableHead>
                <TableHead scope="col">Nama</TableHead>
                <TableHead scope="col">Nomor Telepon</TableHead>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-user-row>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.phoneNumber || '-'}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        aria-label={`Edit user ${user.username}`}
                      >
                        <Edit className="w-4 h-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className={user.isActive ? 'text-red-600 hover:text-red-700 focus-visible:ring-red-500' : 'text-green-600 hover:text-green-700 focus-visible:ring-green-500'}
                        aria-label={user.isActive ? `Nonaktifkan user ${user.username}` : `Aktifkan user ${user.username}`}
                      >
                        <Power className="w-4 h-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Left side panel - portal ke body agar full viewport dari kiri */}
      {showPanel && createPortal(
        <div
          ref={panelBackdropRef}
          className="fixed inset-0 bg-black/40 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          aria-label={editingUser ? 'Panel edit user' : 'Panel tambah user'}
          onClick={(e) => e.target === e.currentTarget && (setShowPanel(false), setEditingUser(null))}
        >
          <aside
            ref={panelRef}
            className="fixed left-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl flex flex-col border-r border-gray-200 z-[101]"
            style={{ minHeight: '100dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200">
              <h2 id="panel-title" className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Tambah User'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowPanel(false);
                  setEditingUser(null);
                }}
                aria-label="Tutup panel"
              >
                <X className="w-5 h-5" aria-hidden />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password {!editingUser && '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Nomor Telepon</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Contoh: 081234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    aria-label="Role user"
                  >
                    <option value="admin">Admin</option>
                    <option value="teknisi_simrs">Teknisi SIMRS</option>
                    <option value="teknisi_ipsrs">Teknisi IPSRS</option>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-describedby="isActive-desc"
                  />
                  <Label htmlFor="isActive" id="isActive-desc">Aktif</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingUser ? 'Update' : 'Tambah'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowPanel(false);
                      setEditingUser(null);
                    }}
                    variant="outline"
                    className="flex-1"
                    aria-label="Batal dan tutup"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </main>
  );
};

export default UserManagement;
