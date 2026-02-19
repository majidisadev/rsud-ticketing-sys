import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { getBaseUrl } from '../../config/api';
import ActionModal from '../../components/ActionModal';
import { useAdminPageAnimation, useStaggerListAnimation } from '../../hooks/useAdminPageAnimation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Search, Eye, Plus, Download, Clock, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

const TechnicianMyTasks = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });

  const containerRef = useRef(null);
  const cardStatRefs = [useRef(null), useRef(null), useRef(null)];
  const tableBodyRef = useRef(null);

  useAdminPageAnimation({ containerRef, cardRefs: cardStatRefs, enabled: !loading });
  useStaggerListAnimation(tableBodyRef, 'tr', !loading && tickets.length > 0);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      );
      const res = await api.get(`/tickets/my-tasks?${params}`);
      setTickets(res.data);
    } catch (error) {
      console.error('Fetch my tasks error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenActionModal = (ticket) => {
    setSelectedTicket(ticket);
    setShowActionModal(true);
  };

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const token = localStorage.getItem('token');
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/reports/export/technician/${type}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
        throw new Error(errorData.message || 'Export failed');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tugas-saya.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.message || 'Terjadi kesalahan saat export');
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

  const getPriorityColor = (priority) => {
    const priorityLower = (priority || '').toLowerCase();
    if (priorityLower === 'rendah') {
      return 'text-green-600 font-semibold';
    } else if (priorityLower === 'sedang') {
      return 'text-yellow-600 font-semibold';
    } else if (priorityLower === 'tinggi') {
      return 'text-red-600 font-semibold';
    }
    return '';
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        role="status"
        aria-live="polite"
        aria-label="Memuat tugas saya"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-200 border-t-green-600" />
          <p className="text-sm text-gray-500">Memuat tugas saya...</p>
        </div>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="space-y-4 sm:space-y-6" aria-labelledby="my-tasks-title">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 id="my-tasks-title" className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-green-600" aria-hidden />
            Tugas Saya
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tiket yang Anda tangani</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={() => handleExport('excel')}
            variant="default"
            className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
            aria-label="Export daftar tugas ke Excel"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Export Excel
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            variant="destructive"
            aria-label="Export daftar tugas ke PDF"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg" id="my-tasks-filter-heading">Filter</CardTitle>
        </CardHeader>
        <CardContent aria-labelledby="my-tasks-filter-heading">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="relative">
              <Label htmlFor="my-tasks-search" className="sr-only">Cari</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <Input
                id="my-tasks-search"
                type="search"
                placeholder="Cari nomor tiket, pelapor, unit/ruangan..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
                aria-label="Cari nomor tiket, pelapor, atau unit"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="my-tasks-status" className="sr-only">Status</Label>
              <Select
                id="my-tasks-status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                aria-label="Filter berdasarkan status"
              >
                <option value="">Semua Status</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      <section aria-label="Ringkasan status tugas" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card ref={cardStatRefs[0]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl" aria-hidden>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Diproses</p>
                <p className="text-xl font-bold text-amber-600" aria-live="polite">
                  {tickets.filter((t) => t.status === 'Diproses').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card ref={cardStatRefs[1]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl" aria-hidden>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Selesai</p>
                <p className="text-xl font-bold text-green-600" aria-live="polite">
                  {tickets.filter((t) => t.status === 'Selesai').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card ref={cardStatRefs[2]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl" aria-hidden>
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Batal</p>
                <p className="text-xl font-bold text-red-600" aria-live="polite">
                  {tickets.filter((t) => t.status === 'Batal').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Table */}
      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Nomor Tiket</TableHead>
                <TableHead scope="col">Tanggal Masuk</TableHead>
                <TableHead scope="col">Pelapor</TableHead>
                <TableHead scope="col">Prioritas</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={tableBodyRef}>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="6" className="text-center py-12 text-gray-500">
                    <p>Tidak ada tugas. Tiket yang Anda ambil akan muncul di sini.</p>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                    <TableCell>
                      {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {ticket.reporterName} - {ticket.reporterUnit}
                    </TableCell>
                    <TableCell className={getPriorityColor(ticket.priority)}>
                      {ticket.priority || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenActionModal(ticket)}
                          aria-label={`Tambah tindakan untuk tiket ${ticket.ticketNumber}`}
                        >
                          <Plus className="w-4 h-4 mr-1" aria-hidden />
                          Tindakan
                        </Button>
                        <Link to={`/technician/ticket/${ticket.id}`}>
                          <Button variant="ghost" size="sm" aria-label={`Lihat detail tiket ${ticket.ticketNumber}`}>
                            <Eye className="w-4 h-4 mr-2" aria-hidden />
                            Detail
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Modal */}
      {showActionModal && selectedTicket && (
        <ActionModal
          ticket={selectedTicket}
          onClose={() => {
            setShowActionModal(false);
            setSelectedTicket(null);
          }}
          onUpdate={fetchTickets}
        />
      )}
    </main>
  );
};

export default TechnicianMyTasks;
