import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../config/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Eye, ArrowLeft, Calendar, User, Phone, Building, Tag } from 'lucide-react';
import { useAdminPageAnimation } from '../../hooks/useAdminPageAnimation';

const AdminTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const viewOnlyCardRef = useRef(null);
  const infoCardRef = useRef(null);
  const reporterCardRef = useRef(null);
  const descCardRef = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const getPriorityVariant = (priority) => {
    const variants = {
      tinggi: 'destructive',
      sedang: 'warning',
      rendah: 'success'
    };
    return variants[priority] || 'secondary';
  };

  useAdminPageAnimation({
    containerRef,
    cardRefs: [viewOnlyCardRef, infoCardRef, reporterCardRef, descCardRef],
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
          {ticket.priority && (
            <Badge variant={getPriorityVariant(ticket.priority)}>{ticket.priority}</Badge>
          )}
        </div>
      </header>

      {/* View Only Badge */}
      <Card ref={viewOnlyCardRef} className="bg-blue-50/80 border-blue-200 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-medium text-blue-900">Mode View Only</p>
            <p className="text-xs text-blue-700 mt-1">Sebagai admin, Anda hanya dapat melihat detail tiket. Tidak dapat mengubah status, prioritas, atau menambahkan tindakan.</p>
          </div>
        </CardContent>
      </Card>

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
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Tanggal Masuk</p>
                  <p className="font-medium text-gray-900">{new Date(ticket.createdAt).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Terakhir Update</p>
                  <p className="font-medium text-gray-900">{new Date(ticket.updatedAt).toLocaleString('id-ID')}</p>
                </div>
              </div>
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
