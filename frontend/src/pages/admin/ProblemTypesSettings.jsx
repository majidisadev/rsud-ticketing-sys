import React, { useState, useEffect, useRef } from 'react';
import api from '../../config/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Pencil, Trash2, Plus, X, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useAdminPageAnimation } from '../../hooks/useAdminPageAnimation';

const ProblemTypesSettings = () => {
  const containerRef = useRef(null);
  const tableCardRef = useRef(null);
  const [problemTypes, setProblemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useAdminPageAnimation({ containerRef, cardRefs: [tableCardRef], enabled: !loading });

  const fetchProblemTypes = async () => {
    try {
      const res = await api.get('/problem-types');
      setProblemTypes(res.data || []);
    } catch (error) {
      console.error('Fetch problem types error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblemTypes();
  }, []);

  const handleEdit = (pt) => {
    setEditingId(pt.id);
    setFormData({ name: pt.name });
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingId(null);
    setFormData({ name: '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: '' });
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await api.patch(`/problem-types/${editingId}`, { name: formData.name });
      await fetchProblemTypes();
      setEditingId(null);
      setFormData({ name: '' });
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama tipe masalah wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await api.post('/problem-types', { name: formData.name.trim() });
      await fetchProblemTypes();
      setShowAddForm(false);
      setFormData({ name: '' });
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menambah');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = async (index) => {
    if (index <= 0) return;
    const current = problemTypes[index];
    const prev = problemTypes[index - 1];
    const currentOrder = current.order != null ? current.order : index;
    const prevOrder = prev.order != null ? prev.order : index - 1;
    setSaving(true);
    try {
      await Promise.all([
        api.patch(`/problem-types/${current.id}`, { order: prevOrder }),
        api.patch(`/problem-types/${prev.id}`, { order: currentOrder })
      ]);
      await fetchProblemTypes();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengubah urutan');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveDown = async (index) => {
    if (index < 0 || index >= problemTypes.length - 1) return;
    const current = problemTypes[index];
    const next = problemTypes[index + 1];
    const currentOrder = current.order != null ? current.order : index;
    const nextOrder = next.order != null ? next.order : index + 1;
    setSaving(true);
    try {
      await Promise.all([
        api.patch(`/problem-types/${current.id}`, { order: nextOrder }),
        api.patch(`/problem-types/${next.id}`, { order: currentOrder })
      ]);
      await fetchProblemTypes();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengubah urutan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!deleteConfirmId) {
      setDeleteConfirmId(id);
      return;
    }
    if (deleteConfirmId !== id) return;
    setSaving(true);
    try {
      await api.delete(`/problem-types/${id}`);
      const msg = 'Tipe masalah dihapus.';
      await fetchProblemTypes();
      setDeleteConfirmId(null);
      alert(msg);
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[50vh] gap-4" aria-label="Memuat tipe masalah">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" aria-hidden />
        <p className="text-sm text-gray-600">Memuat…</p>
      </main>
    );
  }

  return (
    <main ref={containerRef} className="space-y-6" aria-label="Pengaturan Tipe Masalah">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Pengaturan Tipe Masalah</h1>
        <p className="text-sm text-gray-600 mt-1">Kelola tipe masalah yang dapat dipilih pada tiket.</p>
      </header>

      <Card ref={tableCardRef} className="shadow-sm border-gray-200/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Daftar Tipe Masalah</CardTitle>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            disabled={showAddForm}
            aria-label="Tambah tipe masalah"
          >
            <Plus className="w-4 h-4 mr-1" aria-hidden />
            Tambah
          </Button>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
              <h3 className="font-medium text-gray-900">Tambah Tipe Masalah</h3>
              <div className="space-y-1 max-w-xs">
                <Label htmlFor="new-name">Nama</Label>
                <Input
                  id="new-name"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Tinggi"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Check className="w-4 h-4 mr-1" aria-hidden />
                  Simpan
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" aria-hidden />
                  Batal
                </Button>
              </div>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nama</TableHead>
                <TableHead scope="col" className="w-24 text-center">Pindah</TableHead>
                <TableHead scope="col">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {problemTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="3" className="text-center py-8 text-gray-500">
                    Belum ada tipe masalah. Klik Tambah untuk menambah.
                  </TableCell>
                </TableRow>
              ) : (
                problemTypes.map((pt, index) => (
                  <TableRow key={pt.id}>
                    {editingId === pt.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                            className="max-w-[140px]"
                          />
                        </TableCell>
                        <TableCell className="text-center">—</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                            <Check className="w-4 h-4" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancel} className="ml-1">
                            <X className="w-4 h-4" aria-hidden />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{pt.name}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleMoveUp(index)}
                              disabled={saving || index === 0}
                              aria-label={`Pindah ${pt.name} ke atas`}
                            >
                              <ChevronUp className="w-4 h-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleMoveDown(index)}
                              disabled={saving || index === problemTypes.length - 1}
                              aria-label={`Pindah ${pt.name} ke bawah`}
                            >
                              <ChevronDown className="w-4 h-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(pt)}
                              aria-label={`Edit ${pt.name}`}
                            >
                              <Pencil className="w-4 h-4" aria-hidden />
                            </Button>
                            {deleteConfirmId === pt.id ? (
                              <>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(pt.id)}
                                  disabled={saving}
                                >
                                  Ya, Hapus
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Batal
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setDeleteConfirmId(pt.id)}
                                aria-label={`Hapus ${pt.name}`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
};

export default ProblemTypesSettings;
