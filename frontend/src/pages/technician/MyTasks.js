import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import ActionModal from '../../components/ActionModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Search, Eye, Plus } from 'lucide-react';

const TechnicianMyTasks = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });

  useEffect(() => {
    fetchTickets();
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tugas Saya</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari nomor tiket, pelapor, unit/ruangan..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="Baru">Baru</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Batal">Batal</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Tiket</TableHead>
                <TableHead>Tanggal Masuk</TableHead>
                <TableHead>Pelapor</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="6" className="text-center py-8 text-gray-500">
                    Tidak ada tugas
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenActionModal(ticket)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Tindakan
                        </Button>
                        <Link to={`/technician/ticket/${ticket.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
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
    </div>
  );
};

export default TechnicianMyTasks;
