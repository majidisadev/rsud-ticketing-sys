import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { UserPlus, Edit, Power, X, CheckCircle, XCircle } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [ipsrsEnabled, setIpsrsEnabled] = useState(false);
  const [togglingIpsrs, setTogglingIpsrs] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
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
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
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
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      isActive: user.isActive
    });
    setShowModal(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Manajemen User</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleToggleIpsrs}
            disabled={togglingIpsrs}
            variant={ipsrsEnabled ? "default" : "outline"}
            className={ipsrsEnabled ? "bg-green-600 hover:bg-green-700" : ""}
            title={ipsrsEnabled ? "IPSRS Aktif - Klik untuk menonaktifkan" : "IPSRS Nonaktif - Klik untuk mengaktifkan"}
          >
            {ipsrsEnabled ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">
              IPSRS: {ipsrsEnabled ? 'Aktif' : 'Nonaktif'}
            </span>
            <span className="sm:hidden">
              {ipsrsEnabled ? 'IPSRS On' : 'IPSRS Off'}
            </span>
          </Button>
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: '',
                password: '',
                fullName: '',
                email: '',
                phoneNumber: '',
                role: 'teknisi_simrs',
                isActive: true
              });
              setShowModal(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah User
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nomor Telepon</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
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
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle>{editingUser ? 'Edit User' : 'Tambah User'}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto flex-1">
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isActive">Aktif</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingUser ? 'Update' : 'Tambah'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingUser(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
