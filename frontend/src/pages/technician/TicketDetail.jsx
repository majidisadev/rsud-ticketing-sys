import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createTimeline, set } from 'animejs';
import api, { getBaseUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useAdminPageAnimation, prefersReducedMotion } from '../../hooks/useAdminPageAnimation';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { ArrowLeft, Upload, Users, UserPlus, CheckCircle, Ticket, FileText, Image } from 'lucide-react';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [showCoAssignModal, setShowCoAssignModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState('');

  const containerRef = useRef(null);
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);
  const actionsRef = useRef(null);
  const modalRef = useRef(null);

  useAdminPageAnimation({
    containerRef,
    cardRefs: [leftColRef, rightColRef, actionsRef],
    enabled: !loading && !!ticket
  });

  useEffect(() => {
    if (!showCoAssignModal || prefersReducedMotion()) return;
    const el = modalRef?.current;
    if (!el) return;
    set(el, { opacity: 0, scale: 0.96 });
    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 200 } });
    tl.add(el, { opacity: { to: 1 }, scale: { to: 1 }, duration: 220 });
  }, [showCoAssignModal]);

  useEffect(() => {
    fetchTicket();
    if (user?.role !== 'admin') {
      fetchTechnicians();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

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

  const fetchTechnicians = async () => {
    try {
      const res = await api.get(`/users/technicians/${user.role}`);
      setTechnicians(res.data);
    } catch (error) {
      console.error('Fetch technicians error:', error);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/tickets/${id}/status`, { status });
      fetchTicket();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handlePriorityChange = async (priority) => {
    try {
      await api.patch(`/tickets/${id}/priority`, { priority });
      fetchTicket();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleCoAssign = async () => {
    if (!selectedTechnician) return;
    try {
      await api.post(`/tickets/${id}/co-assign`, { technicianId: parseInt(selectedTechnician) });
      setShowCoAssignModal(false);
      setSelectedTechnician('');
      fetchTicket();
      alert('Co-assignment berhasil');
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('Ukuran file maksimal 25MB');
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await api.post(`/tickets/${id}/proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchTicket();
      alert('Bukti perbaikan berhasil diupload');
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleTakeTicket = async () => {
    try {
      await api.post(`/tickets/${id}/take`);
      fetchTicket();
      alert('Tiket berhasil diambil');
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  // Can view: all tickets that match user's role (handled by backend)
  const canView = ticket && user?.role !== 'admin';
  
  // Can edit: only if user is assigned or co-assigned
  const canEdit = ticket && user && (
    ticket.assignedTo === user.id ||
    ticket.coAssignments?.some(ca => ca.technicianId === user.id)
  );
  
  // Can take: only for "Baru" status tickets that match user's role and not yet taken
  const canTake = ticket && 
    ticket.status === 'Baru' && 
    user?.role !== 'admin' &&
    ticket.assignedTo === null &&
    ((user?.role === 'teknisi_simrs' && ticket.category === 'SIMRS') ||
     (user?.role === 'teknisi_ipsrs' && ticket.category === 'IPSRS'));
  
  // Check if ticket is taken by another technician (view only)
  const isTakenByOther = ticket && user && 
    ticket.assignedTo !== null && 
    ticket.assignedTo !== user.id &&
    !ticket.coAssignments?.some(ca => ca.technicianId === user.id) &&
    ((user?.role === 'teknisi_simrs' && ticket.category === 'SIMRS') ||
     (user?.role === 'teknisi_ipsrs' && ticket.category === 'IPSRS'));

  const getStatusVariant = (status) => {
    const variants = {
      Baru: 'default',
      Diproses: 'warning',
      Selesai: 'success',
      Batal: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const getPriorityVariant = (priority) => {
    const variants = {
      tinggi: 'destructive',
      sedang: 'warning',
      rendah: 'success'
    };
    return variants[priority] || 'secondary';
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        role="status"
        aria-live="polite"
        aria-label="Memuat detail tiket"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Memuat detail tiket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <main className="text-center py-12 px-4" aria-live="polite">
        <p className="text-gray-600 mb-4">Tiket tidak ditemukan.</p>
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="mt-4"
          aria-label="Kembali ke halaman sebelumnya"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
          Kembali
        </Button>
      </main>
    );
  }

  return (
    <main ref={containerRef} className="space-y-4 sm:space-y-6" aria-labelledby="ticket-detail-title">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              aria-label="Kembali ke halaman sebelumnya"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden />
            </Button>
            <h1 id="ticket-detail-title" className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-blue-600" aria-hidden />
              Detail Tiket
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-11 font-mono">{ticket.ticketNumber}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canTake && (
            <Button
              onClick={handleTakeTicket}
              className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
              aria-label="Ambil tiket ini"
            >
              <CheckCircle className="w-4 h-4 mr-2" aria-hidden />
              Ambil Tiket
            </Button>
          )}
          {!canEdit && canView && (ticket.status === 'Baru' || isTakenByOther) && (
            <Badge variant="outline" className="text-sm" aria-label="Hanya tampilan">
              View Only
            </Badge>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column */}
        <div ref={leftColRef} className="space-y-4 sm:space-y-6">
          <Card className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="w-5 h-5 text-gray-500" aria-hidden />
                Informasi Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">Kategori</Label>
                <p className="font-medium text-gray-900">{ticket.category}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Status</Label>
                {canEdit && user?.role !== 'admin' ? (
                  <Select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </Select>
                ) : (
                  <Badge variant={getStatusVariant(ticket.status)} className="mt-1">
                    {ticket.status}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Prioritas</Label>
                {canEdit && user?.role !== 'admin' ? (
                  <Select
                    value={ticket.priority || ''}
                    onChange={(e) => handlePriorityChange(e.target.value || null)}
                  >
                    <option value="">-</option>
                    <option value="tinggi">Tinggi</option>
                    <option value="sedang">Sedang</option>
                    <option value="rendah">Rendah</option>
                  </Select>
                ) : (
                  <div className="mt-1">
                    {ticket.priority ? (
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600">Teknisi</Label>
                <p className="font-medium text-gray-900">{ticket.assignedTechnician?.fullName || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" aria-hidden />
                Informasi Pelapor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">Nama</Label>
                <p className="font-medium text-gray-900">{ticket.reporterName}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Unit/Ruangan</Label>
                <p className="font-medium text-gray-900">{ticket.reporterUnit}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Nomor Telepon</Label>
                <p className="font-medium text-gray-900">{ticket.reporterPhone}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Tanggal Masuk</Label>
                <p className="font-medium text-gray-900">{new Date(ticket.createdAt).toLocaleString('id-ID')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div ref={rightColRef} className="space-y-4 sm:space-y-6">
          <Card className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Deskripsi Masalah</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>

          {ticket.photoUrl && (
            <Card className="transition-shadow duration-200 hover:shadow-md overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Image className="w-5 h-5 text-gray-500" aria-hidden />
                  Foto Masalah
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={`${getBaseUrl()}${ticket.photoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Foto lampiran masalah dari pelapor"
                  className="w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.photoUrl);
                  }}
                />
              </CardContent>
            </Card>
          )}

          <Card className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Bukti Perbaikan</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.proofPhotoUrl ? (
                <img
                  src={`${getBaseUrl()}${ticket.proofPhotoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Foto bukti perbaikan yang diupload"
                  className="w-full h-auto rounded-lg border border-gray-200 mb-2"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.proofPhotoUrl);
                  }}
                />
              ) : (
                <p className="text-gray-500 mb-2">Belum ada bukti perbaikan</p>
              )}
              {canEdit && user?.role !== 'admin' && (
                <div>
                  <input
                    id="proof-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => document.getElementById('proof-upload')?.click()}
                    aria-label="Pilih file untuk upload bukti perbaikan"
                  >
                    <Upload className="w-4 h-4 mr-2" aria-hidden />
                    Upload Bukti
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {ticket.coAssignments && ticket.coAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Co-Assigned Teknisi</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {ticket.coAssignments.map((ca) => (
                    <li key={ca.id} className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{ca.technician?.fullName}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tindakan Section */}
      <section ref={actionsRef} className="space-y-4 sm:space-y-6" aria-labelledby="tindakan-heading">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle id="tindakan-heading" className="text-lg">Tindakan</CardTitle>
          {canEdit && ticket.assignedTo === user.id && technicians.length > 0 && (
            <Button
              onClick={() => setShowCoAssignModal(true)}
              variant="default"
              className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
              aria-label="Minta bantuan teknisi lain (co-assign)"
            >
              <UserPlus className="w-4 h-4 mr-2" aria-hidden />
              Minta Bantuan
            </Button>
          )}
        </div>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {ticket.actions && ticket.actions.length > 0 ? (
                ticket.actions.map((action) => (
                  <div key={action.id} className="border-l-4 border-blue-500 pl-4">
                    <p className="font-medium capitalize">{action.actionType.replace('-', ' ')}</p>
                    <p className="text-sm text-gray-600">{action.description}</p>
                    <p className="text-xs text-gray-500">
                      oleh {action.creator?.fullName} - {new Date(action.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Belum ada tindakan</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Co-Assign Modal */}
      {showCoAssignModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="co-assign-title"
          aria-describedby="co-assign-desc"
        >
          <Card ref={modalRef} className="max-w-md w-full shadow-xl transition-all duration-200 ease-out">
            <CardHeader>
              <CardTitle id="co-assign-title">Minta Bantuan</CardTitle>
            </CardHeader>
            <CardContent>
              <p id="co-assign-desc" className="text-sm text-gray-500 mb-4">
                Pilih teknisi untuk diajak menangani tiket ini.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="co-assign-technician">Pilih Teknisi</Label>
                  <Select
                    id="co-assign-technician"
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    aria-label="Pilih teknisi untuk co-assign"
                  >
                    <option value="">Pilih Teknisi</option>
                    {technicians
                      .filter(t => t.id !== user.id)
                      .map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.fullName}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCoAssign}
                    disabled={!selectedTechnician}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    aria-label="Assign teknisi yang dipilih"
                  >
                    Assign
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCoAssignModal(false);
                      setSelectedTechnician('');
                    }}
                    variant="outline"
                    className="flex-1"
                    aria-label="Batal dan tutup"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
};

export default TicketDetail;
