import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api, { getBaseUrl } from '../../config/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Search, Plus, Edit2, Trash2, X, Clock, CheckCircle, XCircle, Download } from 'lucide-react';

const MyActivities = () => {
  const [activeTab, setActiveTab] = useState('aktivitas');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [calendarDatesWithDiproses, setCalendarDatesWithDiproses] = useState([]);
  const [calendarDatesOnlySelesaiBatal, setCalendarDatesOnlySelesaiBatal] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDate, setActivityDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  // Report states
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [reportPage, setReportPage] = useState(1);
  const [reportPerPage, setReportPerPage] = useState(20);
  const REPORT_PER_PAGE_OPTIONS = [10, 20, 50, 100];

  // Format date to YYYY-MM-DD (local date, avoid UTC shift)
  const formatDate = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch activities for selected date
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: formatDate(selectedDate)
      });
      const res = await api.get(`/activities?${params}`);
      setActivities(res.data);
    } catch (error) {
      console.error('Fetch activities error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch calendar dates with activities
  const fetchCalendarDates = useCallback(async () => {
    try {
      const date = selectedDate;
      const params = new URLSearchParams({
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });
      const res = await api.get(`/activities/calendar-dates?${params}`);
      const data = res.data || {};
      const norm = (arr) => (arr || []).map(d => (typeof d === 'string' ? d : (d && d.toISOString ? d.toISOString().slice(0, 10) : '')).slice(0, 10)).filter(Boolean);
      if (Array.isArray(data)) {
        setCalendarDatesWithDiproses(norm(data));
        setCalendarDatesOnlySelesaiBatal([]);
      } else {
        setCalendarDatesWithDiproses(norm(data.datesWithDiproses));
        setCalendarDatesOnlySelesaiBatal(norm(data.datesWithOnlySelesaiBatal));
      }
    } catch (error) {
      console.error('Fetch calendar dates error:', error);
    }
  }, [selectedDate]);

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await api.get(`/activities/report?${params}`);
      setReportData(res.data);
    } catch (error) {
      console.error('Fetch report error:', error);
    }
  }, [reportFilters]);

  useEffect(() => {
    if (activeTab === 'aktivitas') {
      fetchActivities();
      fetchCalendarDates();
    } else {
      fetchReportData();
    }
  }, [activeTab, fetchActivities, fetchCalendarDates, fetchReportData]);

  // Reset report page when report data changes (e.g. after filter change)
  useEffect(() => {
    if (activeTab === 'laporan') {
      setReportPage(1);
    }
  }, [reportData, activeTab]);

  // Group activities by status for Kanban
  const groupedActivities = {
    diproses: activities.filter(a => a.status === 'diproses'),
    selesai: activities.filter(a => a.status === 'selesai'),
    batal: activities.filter(a => a.status === 'batal')
  };

  // Handle drag end (reorder within same column OR move to different column)
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const activityId = parseInt(draggableId.replace('activity-', ''));
    const sameColumn = destination.droppableId === source.droppableId;

    if (sameColumn) {
      // Reorder within same status column (update local state only)
      const statusKey = source.droppableId;
      const list = groupedActivities[statusKey];
      const reordered = Array.from(list);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);

      const newActivities = [
        ...(statusKey === 'diproses' ? reordered : groupedActivities.diproses),
        ...(statusKey === 'selesai' ? reordered : groupedActivities.selesai),
        ...(statusKey === 'batal' ? reordered : groupedActivities.batal)
      ];
      setActivities(newActivities);
      return;
    }

    // Move to different column (change status) – call API
    const newStatus = destination.droppableId;
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, status: newStatus } : a
    ));

    try {
      await api.patch(`/activities/${activityId}/status`, { status: newStatus });
      fetchActivities();
    } catch (error) {
      console.error('Update status error:', error);
      fetchActivities();
    }
  };

  // Create activity (gunakan tanggal dari kolom tanggal di modal)
  const handleCreateActivity = async () => {
    if (!activityTitle.trim()) return;

    try {
      await api.post('/activities', {
        title: activityTitle,
        currentDate: activityDate
      });
      setShowModal(false);
      setActivityTitle('');
      fetchActivities();
      fetchCalendarDates();
    } catch (error) {
      console.error('Create activity error:', error);
      alert('Gagal membuat aktivitas');
    }
  };

  // Update activity
  const handleUpdateActivity = async () => {
    if (!activityTitle.trim() || !editingActivity) return;

    try {
      await api.put(`/activities/${editingActivity.id}`, { title: activityTitle });
      setShowModal(false);
      setActivityTitle('');
      setEditingActivity(null);
      fetchActivities();
    } catch (error) {
      console.error('Update activity error:', error);
      alert('Gagal mengupdate aktivitas');
    }
  };

  // Delete activity
  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Hapus aktivitas ini?')) return;

    try {
      await api.delete(`/activities/${id}`);
      fetchActivities();
      fetchCalendarDates();
    } catch (error) {
      console.error('Delete activity error:', error);
      alert('Gagal menghapus aktivitas');
    }
  };

  // Open create modal (default tanggal hari ini)
  const openCreateModal = () => {
    setModalMode('create');
    setActivityTitle('');
    setActivityDate(formatDate(new Date()));
    setEditingActivity(null);
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (activity) => {
    setModalMode('edit');
    setActivityTitle(activity.title);
    setEditingActivity(activity);
    setShowModal(true);
  };

  // Dot kalender: kuning jika ada aktivitas diproses, abu-abu jika hanya selesai/batal
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDate(date);
      const hasDiproses = calendarDatesWithDiproses.some(cd => (cd && cd.slice(0, 10)) === dateStr);
      const onlySelesaiBatal = calendarDatesOnlySelesaiBatal.some(cd => (cd && cd.slice(0, 10)) === dateStr);
      if (hasDiproses) {
        return <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto mt-1"></div>;
      }
      if (onlySelesaiBatal) {
        return <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mt-1"></div>;
      }
    }
    return null;
  };

  // Handle month change
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    setSelectedDate(activeStartDate);
  };

  const getStatusVariant = (status) => {
    const variants = {
      diproses: 'warning',
      selesai: 'success',
      batal: 'destructive',
      Diproses: 'warning',
      Selesai: 'success',
      Batal: 'destructive',
      Baru: 'default'
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

  // Pagination for Laporan tab
  const reportTotalItems = reportData.length;
  const reportTotalPages = Math.max(1, Math.ceil(reportTotalItems / reportPerPage));
  const reportPageSafe = Math.min(Math.max(1, reportPage), reportTotalPages);
  const reportPaginatedData = reportData.slice(
    (reportPageSafe - 1) * reportPerPage,
    reportPageSafe * reportPerPage
  );

  const handleReportPerPageChange = (value) => {
    const num = parseInt(value, 10);
    setReportPerPage(num);
    setReportPage(1);
  };

  const handleExportReport = async (type) => {
    try {
      const params = new URLSearchParams();
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const token = localStorage.getItem('token');
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/activities/report/export/${type}?${params.toString()}`;
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
      a.download = `laporan-aktivitas.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert(error.message || 'Terjadi kesalahan saat export');
    }
  };

  // Kanban column component
  const KanbanColumn = ({ status, title, icon: Icon, activities, bgColor, borderColor }) => (
    <div className={`flex-1 min-w-[280px] ${bgColor} rounded-lg p-3`}>
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderColor}`}>
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{activities.length}</Badge>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] space-y-2 transition-colors ${
              snapshot.isDraggingOver ? 'bg-gray-100 rounded-lg' : ''
            }`}
          >
            {activities.map((activity, index) => (
              <Draggable
                key={activity.id}
                draggableId={`activity-${activity.id}`}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white p-3 rounded-lg shadow-sm border ${
                      snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-sm flex-1">{activity.title}</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(activity)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                    {activity.endTime && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Selesai: {formatTime(activity.endTime)}</span>
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Aktivitas Saya</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('aktivitas')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'aktivitas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Aktivitas
          </button>
          <button
            onClick={() => setActiveTab('laporan')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'laporan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Laporan
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'aktivitas' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Aktivitas
            </Button>
          </div>

          {/* Calendar */}
          <Card>
            <CardContent className="p-4">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                onActiveStartDateChange={handleActiveStartDateChange}
                tileContent={tileContent}
                className="w-full border-none"
                locale="id-ID"
              />
            </CardContent>
          </Card>

          {/* Selected Date Display */}
          <div className="text-lg font-semibold text-gray-700">
            Aktivitas pada {formatDisplayDate(selectedDate)}
          </div>

          {/* Kanban Board */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                <KanbanColumn
                  status="diproses"
                  title="Diproses"
                  icon={Clock}
                  activities={groupedActivities.diproses}
                  bgColor="bg-yellow-50"
                  borderColor="border-yellow-200"
                />
                <KanbanColumn
                  status="selesai"
                  title="Selesai"
                  icon={CheckCircle}
                  activities={groupedActivities.selesai}
                  bgColor="bg-green-50"
                  borderColor="border-green-200"
                />
                <KanbanColumn
                  status="batal"
                  title="Batal"
                  icon={XCircle}
                  activities={groupedActivities.batal}
                  bgColor="bg-red-50"
                  borderColor="border-red-200"
                />
              </div>
            </DragDropContext>
          )}
        </div>
      ) : (
        // Laporan Tab
        <div className="space-y-4">
          {/* Export buttons - filter mempengaruhi hasil export */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={() => handleExportReport('excel')}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={() => handleExportReport('pdf')} variant="destructive">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* Report Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari judul/deskripsi..."
                    value={reportFilters.search}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={reportFilters.status}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Semua Status</option>
                  <option value="diproses">Diproses</option>
                  <option value="selesai">Selesai</option>
                  <option value="batal">Batal</option>
                </Select>
                <Input
                  type="date"
                  value={reportFilters.dateFrom}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  placeholder="Dari Tanggal"
                />
                <Input
                  type="date"
                  value={reportFilters.dateTo}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  placeholder="Sampai Tanggal"
                />
              </div>
            </CardContent>
          </Card>

          {/* Report Table - Pagination controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Tampilkan</span>
              <Select
                value={String(reportPerPage)}
                onChange={(e) => handleReportPerPageChange(e.target.value)}
                className="w-20"
              >
                {REPORT_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
              <span className="text-sm text-gray-600">per halaman</span>
            </div>
            {reportTotalItems > 0 && (
              <div className="text-sm text-gray-600">
                Menampilkan {(reportPageSafe - 1) * reportPerPage + 1}–{Math.min(reportPageSafe * reportPerPage, reportTotalItems)} dari {reportTotalItems} data
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Judul Aktivitas / Deskripsi Masalah</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportPaginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="4" className="text-center py-8 text-gray-500">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportPaginatedData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {new Date(item.date).toLocaleDateString('id-ID')}
                        </TableCell>
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
                          <Badge variant={getStatusVariant(item.status)}>
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

          {/* Report pagination - page numbers */}
          {reportTotalItems > 0 && (
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                Halaman {reportPageSafe} dari {reportTotalPages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                  disabled={reportPageSafe <= 1}
                >
                  Sebelumnya
                </Button>
                {Array.from({ length: reportTotalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (reportTotalPages <= 7) return true;
                    if (p === 1 || p === reportTotalPages) return true;
                    if (Math.abs(p - reportPageSafe) <= 2) return true;
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
                          variant={reportPageSafe === p ? 'default' : 'outline'}
                          size="sm"
                          className="min-w-[2.25rem]"
                          onClick={() => setReportPage(p)}
                        >
                          {p}
                        </Button>
                      </React.Fragment>
                    );
                  })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
                  disabled={reportPageSafe >= reportTotalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {modalMode === 'create' ? 'Tambah Aktivitas' : 'Edit Aktivitas'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal
                      </label>
                      <Input
                        type="date"
                        value={activityDate}
                        onChange={(e) => setActivityDate(e.target.value)}
                        min="2020-01-01"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Aktivitas
                    </label>
                    <Input
                      type="text"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      placeholder="Masukkan judul aktivitas..."
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <Button
                  onClick={modalMode === 'create' ? handleCreateActivity : handleUpdateActivity}
                  disabled={!activityTitle.trim()}
                >
                  {modalMode === 'create' ? 'Tambah' : 'Simpan'}
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Calendar Styles */}
      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        .react-calendar__tile {
          padding: 10px 6px;
        }
        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white;
        }
        .react-calendar__tile--now {
          background: #dbeafe;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background: #eff6ff;
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: #2563eb !important;
        }
        .react-calendar__navigation button {
          font-size: 1rem;
          font-weight: 500;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background: #eff6ff;
        }
        .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.75rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default MyActivities;
