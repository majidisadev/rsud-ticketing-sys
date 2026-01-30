import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { ArrowLeft, Upload, Users, UserPlus, CheckCircle } from 'lucide-react';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [showCoAssignModal, setShowCoAssignModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState('');

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Tiket tidak ditemukan</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Detail Tiket</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 ml-11">{ticket.ticketNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          {canTake && (
            <Button onClick={handleTakeTicket} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Ambil Tiket
            </Button>
          )}
          {!canEdit && canView && (ticket.status === 'Baru' || isTakenByOther) && (
            <Badge variant="outline" className="text-sm">
              View Only
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Tiket</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Pelapor</CardTitle>
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
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deskripsi Masalah</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </CardContent>
          </Card>

          {ticket.photoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Foto Masalah</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={`${getBaseUrl()}${ticket.photoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Foto masalah"
                  className="w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.photoUrl);
                  }}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bukti Perbaikan</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.proofPhotoUrl ? (
                <img
                  src={`${getBaseUrl()}${ticket.proofPhotoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Bukti perbaikan"
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
                  >
                    <Upload className="w-4 h-4 mr-2" />
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

      {/* Tindakan Section - Show for all tickets, but only editable if canEdit */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Tindakan</CardTitle>
          {canEdit && ticket.assignedTo === user.id && technicians.length > 0 && (
            <Button
              onClick={() => setShowCoAssignModal(true)}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Minta Bantuan
            </Button>
          )}
        </div>
        <Card>
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
      </div>

      {/* Co-Assign Modal */}
      {showCoAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Minta Bantuan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Pilih Teknisi</Label>
                  <Select
                    id="technician"
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
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
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
