import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { getBaseUrl } from '../../config/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Download, Search, Trash2, Eye, Inbox, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAdminPageAnimation, useStaggerListAnimation } from '../../hooks/useAdminPageAnimation';

const AllTicketsAdmin = () => {
  const containerRef = useRef(null);
  const filterCardRef = useRef(null);
  const statCard1Ref = useRef(null);
  const statCard2Ref = useRef(null);
  const statCard3Ref = useRef(null);
  const statCard4Ref = useRef(null);
  const tableCardRef = useRef(null);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      const res = await api.get(`/tickets?${params}`);
      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error('Fetch tickets error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus tiket ini?')) {
      try {
        await api.delete(`/tickets/${id}`);
        fetchTickets();
      } catch (error) {
        alert(error.response?.data?.message || 'Terjadi kesalahan');
      }
    }
  };

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const token = localStorage.getItem('token');
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/reports/export/${type}?${params.toString()}`;
      
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
      a.download = `laporan-tiket.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.message || 'Terjadi kesalahan saat export');
    }
  };

  useAdminPageAnimation({
    containerRef,
    cardRefs: [filterCardRef, statCard1Ref, statCard2Ref, statCard3Ref, statCard4Ref, tableCardRef],
    enabled: !loading
  });
  useStaggerListAnimation(tableCardRef, 'tr[data-ticket-row]', !loading && tickets.length > 0);

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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="status" aria-live="polite" aria-label="Memuat tiket">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" aria-hidden="true" />
        <p className="text-sm text-gray-600">Memuat data tiket…</p>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="space-y-5 sm:space-y-6" aria-label="Halaman semua tiket">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Semua Tiket</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button onClick={() => handleExport('excel')} variant="default" className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500" aria-label="Export ke Excel">
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Export Excel
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="destructive" aria-label="Export ke PDF">
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card ref={filterCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500" aria-hidden />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <Input
                type="search"
                placeholder="Cari nomor tiket, pelapor, unit..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
                aria-label="Cari nomor tiket, pelapor, atau unit"
                autoComplete="off"
              />
            </div>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              aria-label="Filter status"
            >
              <option value="">Semua Status</option>
              <option value="Baru">Baru</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Batal">Batal</option>
            </Select>
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              aria-label="Filter kategori"
            >
              <option value="">Semua Kategori</option>
              <option value="SIMRS">SIMRS</option>
              <option value="IPSRS">IPSRS</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label htmlFor="date-from-tickets" className="sr-only">Dari Tanggal</label>
            <Input
              id="date-from-tickets"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              aria-label="Dari tanggal"
            />
            <label htmlFor="date-to-tickets" className="sr-only">Sampai Tanggal</label>
            <Input
              id="date-to-tickets"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              aria-label="Sampai tanggal"
            />
            <Select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              aria-label="Filter prioritas"
            >
              <option value="">Semua Prioritas</option>
              <option value="tinggi">Tinggi</option>
              <option value="sedang">Sedang</option>
              <option value="rendah">Rendah</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Ringkasan status tiket">
        <Card ref={statCard1Ref} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600" aria-hidden>
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Baru</p>
                <p className="text-xl font-bold text-blue-600 tabular-nums">
                  {tickets.filter((t) => t.status === 'Baru').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card ref={statCard2Ref} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600" aria-hidden>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Diproses</p>
                <p className="text-xl font-bold text-amber-600 tabular-nums">
                  {tickets.filter((t) => t.status === 'Diproses').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card ref={statCard3Ref} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600" aria-hidden>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Selesai</p>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">
                  {tickets.filter((t) => t.status === 'Selesai').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card ref={statCard4Ref} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 rounded-xl text-red-600" aria-hidden>
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Batal</p>
                <p className="text-xl font-bold text-red-600 tabular-nums">
                  {tickets.filter((t) => t.status === 'Batal').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Table */}
      <Card ref={tableCardRef} className="shadow-sm border-gray-200/80 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Kategori</TableHead>
                <TableHead scope="col">Nomor Tiket</TableHead>
                <TableHead scope="col">Tanggal Masuk</TableHead>
                <TableHead scope="col">Pelapor</TableHead>
                <TableHead scope="col">Teknisi</TableHead>
                <TableHead scope="col">Prioritas</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="8" className="text-center py-10 text-gray-500">
                    Tidak ada tiket
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} data-ticket-row>
                    <TableCell className="font-medium">{ticket.category}</TableCell>
                    <TableCell>{ticket.ticketNumber}</TableCell>
                    <TableCell>
                      {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      {ticket.reporterName} - {ticket.reporterUnit}
                    </TableCell>
                    <TableCell>
                      {ticket.assignedTechnician ? (
                        <div className="text-sm">{ticket.assignedTechnician.fullName}</div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </TableCell>
                    <TableCell>{ticket.priority || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/ticket/${ticket.id}`} aria-label={`Lihat detail tiket ${ticket.ticketNumber}`}>
                          <Button variant="ghost" size="sm" aria-label={`Lihat detail tiket ${ticket.ticketNumber}`}>
                            <Eye className="w-4 h-4" aria-hidden />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ticket.id)}
                          className="text-red-600 hover:text-red-700 focus-visible:ring-red-500"
                          aria-label={`Hapus tiket ${ticket.ticketNumber}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <nav className="flex justify-center items-center gap-2" aria-label="Navigasi halaman tiket">
        <Button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          variant="outline"
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </Button>
        <span className="px-4 py-2 text-sm text-gray-600" role="status">
          Halaman <strong>{page}</strong> dari {totalPages}
        </span>
        <Button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          variant="outline"
          aria-label="Halaman berikutnya"
        >
          Selanjutnya
        </Button>
      </nav>
    </main>
  );
};

export default AllTicketsAdmin;
