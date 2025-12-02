import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api, { getBaseUrl } from '../config/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, Copy, Download, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

const TrackTicket = () => {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const ticketRef = useRef(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/tickets/track/${ticketNumber}`);
        setTicket(res.data);
      } catch (err) {
        setError('Tiket tidak ditemukan');
      } finally {
        setLoading(false);
      }
    };

    if (ticketNumber) {
      fetchTicket();
    }
  }, [ticketNumber]);

  const getStatusVariant = (status) => {
    const variants = {
      Baru: 'default',
      Diproses: 'warning',
      Selesai: 'success',
      Batal: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const handleCopyTicketNumber = async () => {
    try {
      await navigator.clipboard.writeText(ticket.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveAsImage = async () => {
    if (!ticketRef.current) return;

    try {
      // Hide buttons temporarily during capture
      const saveButton = document.querySelector('[data-save-button]');
      if (saveButton) saveButton.style.display = 'none';

      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#f9fafb',
        scale: 2,
        logging: false,
        useCORS: true
      });

      // Restore button visibility
      if (saveButton) saveButton.style.display = '';

      const link = document.createElement('a');
      link.download = `tiket-${ticket.ticketNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to save image:', err);
      alert('Gagal menyimpan gambar');
      // Restore button visibility in case of error
      const saveButton = document.querySelector('[data-save-button]');
      if (saveButton) saveButton.style.display = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Tiket Tidak Ditemukan</h1>
            <a href="/">
              <Button variant="outline">Kembali ke Beranda</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6" ref={ticketRef}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle>Detail Tiket</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-600">{ticket.ticketNumber}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTicketNumber}
                    className="h-6 w-6 p-0"
                    title="Salin nomor tiket"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsImage}
                  className="flex items-center gap-2"
                  data-save-button
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Simpan sebagai Gambar</span>
                </Button>
                <Badge variant={getStatusVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Kategori</p>
                <p className="font-medium">{ticket.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pelapor</p>
                <p className="font-medium">{ticket.reporterName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unit/Ruangan</p>
                <p className="font-medium">{ticket.reporterUnit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nomor Telepon</p>
                <p className="font-medium">{ticket.reporterPhone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tanggal Masuk</p>
                <p className="font-medium">{new Date(ticket.createdAt).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teknisi</p>
                <p className="font-medium">
                  {ticket.assignedTechnician 
                    ? `${ticket.assignedTechnician.fullName}${ticket.assignedTechnician.phoneNumber ? ` - ${ticket.assignedTechnician.phoneNumber}` : ''}`
                    : '-'}
                  {ticket.coAssignments && ticket.coAssignments.length > 0 && (
                    <span className="text-gray-500 ml-2">
                      (+ {ticket.coAssignments
                        .map(ca => ca.technician 
                          ? `${ca.technician.fullName}${ca.technician.phoneNumber ? ` - ${ca.technician.phoneNumber}` : ''}`
                          : null)
                        .filter(Boolean)
                        .join(', ')})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Deskripsi Masalah</p>
              <p className="text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.photoUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Foto Masalah</p>
                <img
                  src={`${getBaseUrl()}${ticket.photoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Foto masalah"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.photoUrl);
                  }}
                />
              </div>
            )}

            {ticket.proofPhotoUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Bukti Perbaikan</p>
                <img
                  src={`${getBaseUrl()}${ticket.proofPhotoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Bukti perbaikan"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    console.error('Image load error:', ticket.proofPhotoUrl);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {ticket.actions && ticket.actions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Tindakan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.actions.map((action) => (
                  <div key={action.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 capitalize">{action.actionType.replace('-', ' ')}</p>
                        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          oleh {action.creator?.fullName || 'System'} - {new Date(action.createdAt).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <a href="/">
            <Button variant="outline">Kembali ke Beranda</Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TrackTicket;
