import React, { useState, useEffect, useRef } from "react";
import api from "../../config/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { useAdminPageAnimation } from "../../hooks/useAdminPageAnimation";

const ProblemTypesSettings = () => {
  const containerRef = useRef(null);
  const listCardRef = useRef(null);
  const [problemTypes, setProblemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useAdminPageAnimation({
    containerRef,
    cardRefs: [listCardRef],
    enabled: !loading,
  });

  const fetchProblemTypes = async () => {
    try {
      const res = await api.get("/problem-types");
      setProblemTypes(res.data || []);
    } catch (error) {
      console.error("Fetch problem types error:", error);
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
    setFormData({ name: "" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: "" });
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await api.patch(`/problem-types/${editingId}`, { name: formData.name });
      await fetchProblemTypes();
      setEditingId(null);
      setFormData({ name: "" });
    } catch (error) {
      alert(error.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      alert("Nama tipe masalah wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/problem-types", { name: formData.name.trim() });
      await fetchProblemTypes();
      setShowAddForm(false);
      setFormData({ name: "" });
    } catch (error) {
      alert(error.response?.data?.message || "Gagal menambah");
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
      const msg = "Tipe masalah dihapus.";
      await fetchProblemTypes();
      setDeleteConfirmId(null);
      alert(msg);
    } catch (error) {
      alert(error.response?.data?.message || "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main
        className="flex flex-col items-center justify-center min-h-[50vh] gap-4"
        aria-label="Memuat tipe masalah"
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600"
          aria-hidden
        />
        <p className="text-sm text-gray-600">Memuat…</p>
      </main>
    );
  }

  return (
    <main
      ref={containerRef}
      className="space-y-6"
      aria-label="Pengaturan Tipe Masalah"
    >
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Pengaturan Tipe Masalah
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Kelola tipe masalah yang dapat dipilih pada tiket.
        </p>
      </header>

      <Card ref={listCardRef} className="shadow-sm border-gray-200/80">
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
        <CardContent className="space-y-3">
          {showAddForm && (
            <form
              onSubmit={handleCreate}
              className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200/80"
            >
              <h3 className="font-medium text-gray-900">Tambah Tipe Masalah</h3>
              <div className="space-y-1 max-w-xs">
                <Label htmlFor="new-name">Nama</Label>
                <Input
                  id="new-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Contoh: Hardware"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  <Check className="w-4 h-4 mr-1" aria-hidden />
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4 mr-1" aria-hidden />
                  Batal
                </Button>
              </div>
            </form>
          )}

          {problemTypes.length === 0 ? (
            <p className="text-center py-8 text-gray-500 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
              Belum ada tipe masalah. Klik Tambah untuk menambah.
            </p>
          ) : (
            <ul
              className="space-y-2 list-none p-0 m-0"
              aria-label="Daftar tipe masalah"
            >
              {problemTypes.map((pt) => (
                <li key={pt.id}>
                  <Card className="border border-gray-200/80 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                    <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                      {editingId === pt.id ? (
                        <>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            className="max-w-[200px] flex-1 min-w-0"
                            aria-label="Nama tipe masalah"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={saving}
                              aria-label="Simpan"
                            >
                              <Check className="w-4 h-4" aria-hidden />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              aria-label="Batal"
                            >
                              <X className="w-4 h-4" aria-hidden />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-gray-900">
                            {pt.name}
                          </span>
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
                        </>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ProblemTypesSettings;
