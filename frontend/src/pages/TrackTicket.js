import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { getBaseUrl } from '../config/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle } from 'lucide-react';

const TrackTicket = () => {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Detail Tiket</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{ticket.ticketNumber}</p>
              </div>
              <Badge variant={getStatusVariant(ticket.status)}>
                {ticket.status}
              </Badge>
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
                <p className="font-medium">{ticket.assignedTechnician?.fullName || '-'}</p>
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
                  src={`${getBaseUrl()}${ticket.photoUrl}`}
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
                  src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${ticket.proofPhotoUrl}`}
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
