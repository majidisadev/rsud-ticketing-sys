import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../config/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Calendar, User, Phone, Building, Tag, Pencil, Check, X } from 'lucide-react';
import { useAdminPageAnimation } from '../../hooks/useAdminPageAnimation';

const toDatetimeLocal = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const infoCardRef = useRef(null);
  const reporterCardRef = useRef(null);
  const descCardRef = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingTimes, setEditingTimes] = useState(false);
  const [timeForm, setTimeForm] = useState({ createdAt: '', pickedUpAt: '', lastStatusChangeAt: '' });
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => {
    fetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data);
    } catch (error) {
      console.error('Fetch ticket error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      Baru: 'default',
      Diproses: 'warning',
      Selesai: 'success',
      Batal: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const getProblemTypeVariant = (slugOrName) => {
    const s = (slugOrName || '').toLowerCase();
    if (s === 'tinggi') return 'destructive';
    if (s === 'sedang') return 'warning';
    if (s === 'rendah') return 'success';
    return 'secondary';
  };

  const startEditTimes = () => {
    setTimeForm({
      createdAt: toDatetimeLocal(ticket.createdAt),
      pickedUpAt: toDatetimeLocal(ticket.pickedUpAt),
      lastStatusChangeAt: toDatetimeLocal(ticket.lastStatusChangeAt || ticket.updatedAt)
    });
    setEditingTimes(true);
  };

  const cancelEditTimes = () => {
    setEditingTimes(false);
  };

  const saveTimes = async () => {
    setSavingTimes(true);
    try {
      const body = {};
      if (timeForm.createdAt) body.createdAt = new Date(timeForm.createdAt).toISOString();
      if (timeForm.pickedUpAt) body.pickedUpAt = new Date(timeForm.pickedUpAt).toISOString();
      if (timeForm.lastStatusChangeAt) body.lastStatusChangeAt = new Date(timeForm.lastStatusChangeAt).toISOString();
      await api.patch(`/tickets/${id}/admin`, body);
      await fetchTicket();
      setEditingTimes(false);
    } catch (error) {
      console.error('Save times error:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSavingTimes(false);
    }
  };

  useAdminPageAnimation({
    containerRef,
    cardRefs: [infoCardRef, reporterCardRef, descCardRef],
    enabled: !!ticket && !loading
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="status" aria-live="polite" aria-label="Memuat detail tiket">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" aria-hidden="true" />
        <p className="text-sm text-gray-600">Memuat detail tiket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <main className="text-center py-12" aria-label="Tiket tidak ditemukan">
        <p className="text-gray-600 mb-4">Tiket tidak ditemukan</p>
        <Button onClick={() => navigate(-1)} variant="outline" aria-label="Kembali ke halaman sebelumnya">
          Kembali
        </Button>
      </main>
    );
  }

  return (
    <main ref={containerRef} className="space-y-5 sm:space-y-6" aria-label={`Detail tiket ${ticket.ticketNumber}`}>
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              aria-label="Kembali ke daftar tiket"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Detail Tiket</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-11">{ticket.ticketNumber}</p>
        </div>
        <div className="flex items-center gap-2 ml-11 sm:ml-0 flex-wrap">
          <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
          {ticket.problemType?.name && (
            <Badge variant={getProblemTypeVariant(ticket.problemType.slug || ticket.problemType.name)}>{ticket.problemType.name}</Badge>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Basic Info Card */}
          <Card ref={infoCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Tiket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Kategori</p>
                  <p className="font-medium text-gray-900">{ticket.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Teknisi</p>
                  <p className="font-medium text-gray-900">{ticket.assignedTechnician?.fullName || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Tipe Masalah</p>
                  <p className="font-medium text-gray-900">{ticket.problemType?.name || '-'}</p>
                </div>
              </div>
              {!editingTimes ? (
                <>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Waktu Masuk</p>
                      <p className="font-medium text-gray-900">{new Date(ticket.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Waktu Ambil</p>
                      <p className="font-medium text-gray-900">{ticket.pickedUpAt ? new Date(ticket.pickedUpAt).toLocaleString('id-ID') : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Waktu Terakhir Update</p>
                      <p className="font-medium text-gray-900">{new Date(ticket.lastStatusChangeAt || ticket.updatedAt).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={startEditTimes} aria-label="Edit waktu">
                    <Pencil className="w-4 h-4 mr-1" aria-hidden />
                    Edit Waktu
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="admin-createdAt">Waktu Masuk</Label>
                    <Input
                      id="admin-createdAt"
                      type="datetime-local"
                      value={timeForm.createdAt}
                      onChange={(e) => setTimeForm((f) => ({ ...f, createdAt: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-pickedUpAt">Waktu Ambil</Label>
                    <Input
                      id="admin-pickedUpAt"
                      type="datetime-local"
                      value={timeForm.pickedUpAt}
                      onChange={(e) => setTimeForm((f) => ({ ...f, pickedUpAt: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-lastStatusChangeAt">Waktu Terakhir Update</Label>
                    <Input
                      id="admin-lastStatusChangeAt"
                      type="datetime-local"
                      value={timeForm.lastStatusChangeAt}
                      onChange={(e) => setTimeForm((f) => ({ ...f, lastStatusChangeAt: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveTimes} disabled={savingTimes} aria-label="Simpan waktu">
                      <Check className="w-4 h-4 mr-1" aria-hidden />
                      Simpan
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditTimes} disabled={savingTimes} aria-label="Batal">
                      <X className="w-4 h-4 mr-1" aria-hidden />
                      Batal
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reporter Info Card */}
          <Card ref={reporterCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Pelapor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Nama</p>
                  <p className="font-medium text-gray-900">{ticket.reporterName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Unit/Ruangan</p>
                  <p className="font-medium text-gray-900">{ticket.reporterUnit}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Nomor Telepon</p>
                  <p className="font-medium text-gray-900">{ticket.reporterPhone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">
          {/* Description Card */}
          <Card ref={descCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Deskripsi Masalah</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Photos */}
          {ticket.photoUrl && (
            <Card className="shadow-sm border-gray-200/80 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Foto Masalah</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={`${getBaseUrl()}${ticket.photoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Foto masalah yang dilaporkan"
                  className="w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.photoUrl);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {ticket.proofPhotoUrl && (
            <Card className="shadow-sm border-gray-200/80 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Bukti Perbaikan</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={`${getBaseUrl()}${ticket.proofPhotoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Bukti foto perbaikan"
                  className="w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.proofPhotoUrl);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Co-Assignments */}
          {ticket.coAssignments && ticket.coAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Co-Assigned Teknisi</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ticket.coAssignments.map((ca) => (
                    <li key={ca.id} className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{ca.technician?.fullName}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions History */}
      {ticket.actions && ticket.actions.length > 0 && (
        <Card className="shadow-sm border-gray-200/80">
          <CardHeader>
            <CardTitle className="text-lg">Riwayat Tindakan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4" aria-label="Riwayat tindakan">
              {ticket.actions.map((action) => (
                <li key={action.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 capitalize">{action.actionType.replace('-', ' ')}</p>
                      {action.description && (
                        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        oleh {action.creator?.fullName || 'System'} • {new Date(action.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
};

export default AdminTicketDetail;
