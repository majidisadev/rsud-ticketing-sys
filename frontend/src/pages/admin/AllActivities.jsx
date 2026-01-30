import React, { useState, useEffect, useCallback } from 'react';
import api, { getBaseUrl } from '../../config/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select } from '../../components/ui/select';
import { Search, Calendar, Clock, CheckCircle, XCircle, Download } from 'lucide-react';

const AllActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const PER_PAGE_OPTIONS = [10, 20, 50, 100];

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await api.get(`/activities/all-combined?${params}`);
      setActivities(res.data);
    } catch (error) {
      console.error('Fetch activities error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    setPage(1);
  }, [activities]);

  const totalItems = activities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const paginatedActivities = activities.slice(
    (pageSafe - 1) * perPage,
    pageSafe * perPage
  );

  const handlePerPageChange = (value) => {
    setPerPage(parseInt(value, 10));
    setPage(1);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const token = localStorage.getItem('token');
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/activities/all-combined/export/${type}?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Export gagal' }));
        throw new Error(errorData.message || 'Export gagal');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `semua-aktivitas.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.message || 'Terjadi kesalahan saat export');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusVariant = (status) => {
    const variants = {
      diproses: 'warning',
      selesai: 'success',
      batal: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      diproses: 'Diproses',
      selesai: 'Selesai',
      batal: 'Batal'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'diproses':
        return <Clock className="w-4 h-4" />;
      case 'selesai':
        return <CheckCircle className="w-4 h-4" />;
      case 'batal':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Semua Aktivitas</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleExport('excel')}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => handleExport('pdf')} variant="destructive">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari judul aktivitas / deskripsi masalah..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                placeholder="Dari Tanggal"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                placeholder="Sampai Tanggal"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics (activities + tickets by status) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Diproses</p>
                <p className="text-xl font-bold text-yellow-600">
                  {activities.filter((a) => a.status === 'diproses').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Selesai</p>
                <p className="text-xl font-bold text-green-600">
                  {activities.filter((a) => a.status === 'selesai').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Batal</p>
                <p className="text-xl font-bold text-red-600">
                  {activities.filter((a) => a.status === 'batal').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table - Pagination controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Tampilkan</span>
          <Select
            value={String(perPage)}
            onChange={(e) => handlePerPageChange(e.target.value)}
            className="w-20"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
          <span className="text-sm text-gray-600">per halaman</span>
        </div>
        {totalItems > 0 && (
          <div className="text-sm text-gray-600">
            Menampilkan {(pageSafe - 1) * perPage + 1}–{Math.min(pageSafe * perPage, totalItems)} dari {totalItems} data
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teknisi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Judul Aktivitas / Deskripsi Masalah</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="5" className="text-center py-8 text-gray-500">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              ) : (
                paginatedActivities.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {(() => {
                          const s = item.technicianDisplay || '-';
                          const coIdx = s.indexOf(', Co:');
                          if (coIdx === -1) return s;
                          const main = s.slice(0, coIdx);
                          const coPart = s.slice(coIdx).replace(/^, Co: /, ', ');
                          return (
                            <>
                              {main}
                              <span className="italic text-gray-600">{coPart}</span>
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="truncate">{item.title}</p>
                        {item.type === 'ticket' && item.ticketNumber && (
                          <p className="text-xs text-gray-500">{item.ticketNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'activity' ? 'outline' : 'secondary'}>
                        {item.type === 'activity' ? 'Aktivitas' : 'Tugas'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(item.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(item.status)}
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination - page numbers */}
      {totalItems > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            Halaman {pageSafe} dari {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
            >
              Sebelumnya
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - pageSafe) <= 2) return true;
                return false;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev != null && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <span className="px-2 text-gray-400">…</span>
                    )}
                    <Button
                      variant={pageSafe === p ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-[2.25rem]"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllActivities;
