import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import ActionModal from '../../components/ActionModal';
import { useAdminPageAnimation, useStaggerListAnimation } from '../../hooks/useAdminPageAnimation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Search, Eye, Plus, CheckCircle, Inbox, Clock, XCircle, ListTodo } from 'lucide-react';

const STORAGE_KEY = 'allTasksFilters';
const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const getInitialState = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const defaults = { search: '', status: '', priority: '', dateFrom: '', dateTo: '' };
      const perPage = PER_PAGE_OPTIONS.includes(Number(data.perPage)) ? Number(data.perPage) : 20;
      return {
        filters: { ...defaults, ...data.filters },
        page: typeof data.page === 'number' ? data.page : 1,
        perPage
      };
    }
  } catch (_) {}
  return {
    filters: { search: '', status: '', priority: '', dateFrom: '', dateTo: '' },
    page: 1,
    perPage: 20
  };
};

const TechnicianAllTasks = () => {
  const initialState = getInitialState();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialState.page);
  const [perPage, setPerPage] = useState(initialState.perPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [filters, setFilters] = useState(initialState.filters);

  const containerRef = useRef(null);
  const cardStatRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const tableBodyRef = useRef(null);

  useAdminPageAnimation({ containerRef, cardRefs: cardStatRefs, enabled: !loading });
  useStaggerListAnimation(tableBodyRef, 'tr', !loading && tickets.length > 0);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, filters]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ filters, page, perPage }));
  }, [filters, page, perPage]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });
      const res = await api.get(`/tickets?${params}`);
      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages);
      setTotalItems(res.data.total ?? 0);
    } catch (error) {
      console.error('Fetch tickets error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePerPageChange = (value) => {
    setPerPage(parseInt(value, 10));
    setPage(1);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleTakeTicket = async (ticketId) => {
    try {
      await api.post(`/tickets/${ticketId}/take`);
      fetchTickets();
      alert('Tiket berhasil diambil');
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    }
  };

  const handleOpenActionModal = (ticket) => {
    setSelectedTicket(ticket);
    setShowActionModal(true);
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
        aria-label="Memuat daftar tugas"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Memuat tugas...</p>
        </div>
      </div>
    );
  }

  return (
    <main ref={containerRef} className="space-y-4 sm:space-y-6" aria-labelledby="all-tasks-title">
      <header className="flex flex-col gap-1">
        <h1 id="all-tasks-title" className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ListTodo className="w-7 h-7 text-blue-600" aria-hidden />
          Semua Tugas
        </h1>
        <p className="text-sm text-gray-500">Lihat dan ambil tiket yang tersedia</p>
      </header>

      {/* Filters */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg" id="filter-heading">Filter</CardTitle>
        </CardHeader>
        <CardContent aria-labelledby="filter-heading">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
            <div className="relative">
              <Label htmlFor="all-tasks-search" className="sr-only">Cari</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
              <Input
                id="all-tasks-search"
                type="search"
                placeholder="Cari nomor tiket, pelapor, unit..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
                aria-label="Cari nomor tiket, pelapor, atau unit"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="all-tasks-status" className="sr-only">Status</Label>
              <Select
                id="all-tasks-status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                aria-label="Filter berdasarkan status"
              >
                <option value="">Semua Status</option>
                <option value="Baru">Baru</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="all-tasks-priority" className="sr-only">Prioritas</Label>
              <Select
                id="all-tasks-priority"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                aria-label="Filter berdasarkan prioritas"
              >
                <option value="">Semua Prioritas</option>
                <option value="tinggi">Tinggi</option>
                <option value="sedang">Sedang</option>
                <option value="rendah">Rendah</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="all-tasks-date-from">Dari Tanggal</Label>
              <Input
                id="all-tasks-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                aria-label="Filter dari tanggal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="all-tasks-date-to">Sampai Tanggal</Label>
              <Input
                id="all-tasks-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                aria-label="Filter sampai tanggal"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      <section aria-label="Ringkasan status tiket" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card ref={cardStatRefs[0]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl" aria-hidden>
                <Inbox className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Baru</p>
                <p className="text-xl font-bold text-blue-600" aria-live="polite">
                  {tickets.filter((t) => t.status === 'Baru').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card ref={cardStatRefs[1]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-amber-500">
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
        <Card ref={cardStatRefs[2]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-green-500">
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
        <Card ref={cardStatRefs[3]} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-l-4 border-l-red-500">
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

      {/* Table - Pagination controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="per-page-tasks" className="text-sm text-gray-600">Tampilkan</label>
          <Select
            id="per-page-tasks"
            value={String(perPage)}
            onChange={(e) => handlePerPageChange(e.target.value)}
            className="w-20"
            aria-label="Jumlah baris per halaman"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
          <span className="text-sm text-gray-600">per halaman</span>
        </div>
        {totalItems > 0 && (
          <p className="text-sm text-gray-600" role="status">
            Menampilkan {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalItems)} dari {totalItems} data
          </p>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Kategori</TableHead>
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
                  <TableCell colSpan="7" className="text-center py-12 text-gray-500">
                    <p>Tidak ada tiket yang sesuai filter.</p>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.category}</TableCell>
                  <TableCell>{ticket.ticketNumber}</TableCell>
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
                      {ticket.status === 'Baru' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTakeTicket(ticket.id)}
                          className="text-green-600 hover:text-green-700 focus-visible:ring-green-500"
                          aria-label={`Ambil tiket ${ticket.ticketNumber}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" aria-hidden />
                          Ambil
                        </Button>
                      )}
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
                          <Eye className="w-4 h-4" aria-hidden />
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

      {/* Pagination */}
      <nav className="flex justify-center items-center gap-2 flex-wrap" aria-label="Navigasi halaman">
        <Button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          variant="outline"
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </Button>
        <span className="px-4 py-2 text-sm text-gray-600" aria-current="page">
          Halaman {page} dari {totalPages}
        </span>
        <Button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          variant="outline"
          aria-label="Halaman berikutnya"
        >
          Berikutnya
        </Button>
      </nav>

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

export default TechnicianAllTasks;
