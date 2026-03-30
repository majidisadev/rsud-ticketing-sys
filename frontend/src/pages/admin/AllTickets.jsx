import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api, { getBaseUrl } from "../../config/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { StatusFilterSelect } from "../../components/StatusFilterSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Download,
  Search,
  Trash2,
  Eye,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  useAdminPageAnimation,
  useStaggerListAnimation,
} from "../../hooks/useAdminPageAnimation";
import { toast } from "../../hooks/use-toast";
import { useConfirm } from "../../context/ConfirmContext";

const STORAGE_KEY = "allTicketsFilters";

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

const getInitialState = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const defaults = {
        search: "",
        status: "",
        category: "",
        problemTypeId: "",
        dateFrom: "",
        dateTo: "",
      };
      const timeDefaults = {
        responseTimeAll: false,
        responseTimeMin: "30",
        durationAll: false,
        durationMin: "360",
      };
      const perPage = PER_PAGE_OPTIONS.includes(Number(data.perPage))
        ? Number(data.perPage)
        : 20;
      return {
        filters: { ...defaults, ...data.filters },
        timeFilters: { ...timeDefaults, ...(data.timeFilters || {}) },
        page: typeof data.page === "number" ? data.page : 1,
        perPage,
      };
    }
  } catch (_) {}
  return {
    filters: {
      search: "",
      status: "",
      category: "",
      problemTypeId: "",
      dateFrom: "",
      dateTo: "",
    },
    timeFilters: {
      responseTimeAll: false,
      responseTimeMin: "30",
      durationAll: false,
      durationMin: "360",
    },
    page: 1,
    perPage: 20,
  };
};

const AllTicketsAdmin = () => {
  const initialState = getInitialState();
  const containerRef = useRef(null);
  const filterCardRef = useRef(null);
  const statCard1Ref = useRef(null);
  const statCard2Ref = useRef(null);
  const statCard3Ref = useRef(null);
  const statCard4Ref = useRef(null);
  const tableCardRef = useRef(null);

  const [tickets, setTickets] = useState([]);
  const [statusTotals, setStatusTotals] = useState({
    Baru: 0,
    Diproses: 0,
    Selesai: 0,
    Batal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialState.page);
  const [perPage, setPerPage] = useState(initialState.perPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState(initialState.filters);
  const [timeFilters, setTimeFilters] = useState(initialState.timeFilters);
  const [problemTypes, setProblemTypes] = useState([]);
  const confirm = useConfirm();

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, filters, timeFilters]);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ filters, timeFilters, page, perPage }),
    );
  }, [filters, timeFilters, page, perPage]);

  useEffect(() => {
    const fetchProblemTypes = async () => {
      try {
        const res = await api.get("/problem-types");
        setProblemTypes(res.data || []);
      } catch (e) {
        console.error("Fetch problem types error:", e);
      }
    };
    fetchProblemTypes();
  }, []);

  const fetchTickets = async () => {
    try {
      const showAll = Boolean(
        timeFilters.responseTimeAll || timeFilters.durationAll,
      );
      const paramsObject = {
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      };

      if (showAll) {
        paramsObject.noPagination = "true";
        if (timeFilters.responseTimeAll)
          paramsObject.responseTimeMin = String(
            timeFilters.responseTimeMin ?? "",
          );
        if (timeFilters.durationAll)
          paramsObject.durationMin = String(timeFilters.durationMin ?? "");
      } else {
        paramsObject.page = page.toString();
        paramsObject.limit = perPage.toString();
      }

      // Ensure numbers are sane when checkbox is active.
      if (
        paramsObject.responseTimeMin != null &&
        paramsObject.responseTimeMin !== ""
      ) {
        const n = Number(paramsObject.responseTimeMin);
        paramsObject.responseTimeMin =
          Number.isFinite(n) && n >= 0 ? String(n) : "0";
      }
      if (paramsObject.durationMin != null && paramsObject.durationMin !== "") {
        const n = Number(paramsObject.durationMin);
        paramsObject.durationMin =
          Number.isFinite(n) && n >= 0 ? String(n) : "0";
      }

      const params = new URLSearchParams(paramsObject);
      const res = await api.get(`/tickets?${params}`);
      setTickets(res.data.tickets);
      setTotalPages(res.data.totalPages);
      setTotalItems(res.data.total ?? 0);
      setStatusTotals(res.data.statusTotals || {});
    } catch (error) {
      console.error("Fetch tickets error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePerPageChange = (value) => {
    setPerPage(parseInt(value, 10));
    setPage(1);
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleTimeFilterChange = (name, value) => {
    setTimeFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const showAll = Boolean(
    timeFilters.responseTimeAll || timeFilters.durationAll,
  );

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Hapus tiket?",
      description:
        "Apakah Anda yakin ingin menghapus tiket ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await api.delete(`/tickets/${id}`);
      fetchTickets();
    } catch (error) {
      toast({
        title: error.response?.data?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const token = localStorage.getItem("token");
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/reports/export/${type}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Export failed" }));
        throw new Error(errorData.message || "Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `laporan-tiket.${type === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: error.message || "Terjadi kesalahan saat export",
        variant: "destructive",
      });
    }
  };

  useAdminPageAnimation({
    containerRef,
    cardRefs: [
      filterCardRef,
      statCard1Ref,
      statCard2Ref,
      statCard3Ref,
      statCard4Ref,
      tableCardRef,
    ],
    enabled: !loading,
  });
  useStaggerListAnimation(
    tableCardRef,
    "tr[data-ticket-row]",
    !loading && tickets.length > 0,
  );

  const getStatusVariant = (status) => {
    const variants = {
      Baru: "default",
      Diproses: "warning",
      Selesai: "success",
      Batal: "destructive",
    };
    return variants[status] || "secondary";
  };

  const getStatusIcon = (status) => {
    const icons = {
      Baru: Inbox,
      Diproses: Clock,
      Selesai: CheckCircle,
      Batal: XCircle,
    };
    const Icon = icons[status];
    return Icon ? <Icon className="w-3.5 h-3.5" aria-hidden /> : null;
  };

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[50vh] gap-4"
        role="status"
        aria-live="polite"
        aria-label="Memuat tiket"
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600"
          aria-hidden="true"
        />
        <p className="text-sm text-gray-600">Memuat data tiket…</p>
      </div>
    );
  }

  return (
    <main
      ref={containerRef}
      className="space-y-5 sm:space-y-6"
      aria-label="Halaman semua tiket"
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Semua Tiket
        </h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            onClick={() => handleExport("excel")}
            variant="default"
            className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
            aria-label="Export ke Excel"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Export Excel
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            variant="destructive"
            aria-label="Export ke PDF"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card
        ref={filterCardRef}
        className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md"
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500" aria-hidden />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-center">
            <div className="relative md:col-span-8">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Cari nomor tiket, pelapor, unit..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10 h-10"
                aria-label="Cari nomor tiket, pelapor, atau unit"
                autoComplete="off"
              />
            </div>
            <label htmlFor="date-from-tickets" className="sr-only">
              Dari Tanggal
            </label>
            <Input
              id="date-from-tickets"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              aria-label="Dari tanggal"
              className="h-10 md:col-span-2 md:min-w-[160px]"
            />
            <label htmlFor="date-to-tickets" className="sr-only">
              Sampai Tanggal
            </label>
            <Input
              id="date-to-tickets"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              aria-label="Sampai tanggal"
              className="h-10 md:col-span-2 md:min-w-[160px]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusFilterSelect
              variant="ticket"
              value={filters.status}
              onChange={(v) => handleFilterChange("status", v)}
              aria-label="Filter status"
            />
            <Select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              aria-label="Filter kategori"
            >
              <option value="">Semua Kategori</option>
              <option value="SIMRS">SIMRS</option>
              <option value="IPSRS">IPSRS</option>
            </Select>
            <Select
              value={filters.problemTypeId}
              onChange={(e) =>
                handleFilterChange("problemTypeId", e.target.value)
              }
              aria-label="Filter tipe masalah"
            >
              <option value="">Semua Tipe Masalah</option>
              {problemTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-gray-200/80 p-3">
              <input
                id="filter-response-time-all"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={Boolean(timeFilters.responseTimeAll)}
                onChange={(e) =>
                  handleTimeFilterChange("responseTimeAll", e.target.checked)
                }
                aria-label="Tampilkan semua data dengan response time lebih dari batas minimal"
              />
              <div className="flex-1">
                <label
                  htmlFor="filter-response-time-all"
                  className="text-sm font-medium text-gray-900"
                >
                  Tampilkan Response Time &gt; (menit)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={timeFilters.responseTimeMin}
                    onChange={(e) =>
                      handleTimeFilterChange("responseTimeMin", e.target.value)
                    }
                    className="h-9 w-28"
                    aria-label="Batas minimal response time (menit)"
                    disabled={!timeFilters.responseTimeAll}
                  />
                  <span className="text-sm text-gray-500">menit</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-gray-200/80 p-3">
              <input
                id="filter-duration-all"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={Boolean(timeFilters.durationAll)}
                onChange={(e) =>
                  handleTimeFilterChange("durationAll", e.target.checked)
                }
                aria-label="Tampilkan semua data dengan selisih waktu lebih dari batas minimal"
              />
              <div className="flex-1">
                <label
                  htmlFor="filter-duration-all"
                  className="text-sm font-medium text-gray-900"
                >
                  Tampilkan Selisih Waktu &gt; (menit)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={timeFilters.durationMin}
                    onChange={(e) =>
                      handleTimeFilterChange("durationMin", e.target.value)
                    }
                    className="h-9 w-28"
                    aria-label="Batas minimal selisih waktu (menit)"
                    disabled={!timeFilters.durationAll}
                  />
                  <span className="text-sm text-gray-500">menit</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      <section
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        aria-label="Ringkasan status tiket"
      >
        <Card
          ref={statCard1Ref}
          className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 bg-blue-50 rounded-xl text-blue-600"
                aria-hidden
              >
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Baru</p>
                <p className="text-xl font-bold text-blue-600 tabular-nums">
                  {statusTotals.Baru ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          ref={statCard2Ref}
          className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 bg-amber-50 rounded-xl text-amber-600"
                aria-hidden
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Diproses</p>
                <p className="text-xl font-bold text-amber-600 tabular-nums">
                  {statusTotals.Diproses ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          ref={statCard3Ref}
          className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"
                aria-hidden
              >
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Selesai</p>
                <p className="text-xl font-bold text-emerald-600 tabular-nums">
                  {statusTotals.Selesai ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          ref={statCard4Ref}
          className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 bg-red-50 rounded-xl text-red-600"
                aria-hidden
              >
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Batal</p>
                <p className="text-xl font-bold text-red-600 tabular-nums">
                  {statusTotals.Batal ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Table - Pagination controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {!showAll ? (
          <div className="flex items-center gap-2">
            <label htmlFor="per-page-tickets" className="text-sm text-gray-600">
              Tampilkan
            </label>
            <Select
              id="per-page-tickets"
              value={String(perPage)}
              onChange={(e) => handlePerPageChange(e.target.value)}
              className="w-20"
              aria-label="Jumlah baris per halaman"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <span className="text-sm text-gray-600">per halaman</span>
          </div>
        ) : (
          <p className="text-sm text-gray-600" role="status">
            Mode tampil semua aktif (tanpa pagination)
          </p>
        )}
        {totalItems > 0 && (
          <p className="text-sm text-gray-600" role="status">
            {showAll
              ? `Menampilkan semua ${totalItems} data`
              : `Menampilkan ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalItems)} dari ${totalItems} data`}
          </p>
        )}
      </div>

      {/* Table */}
      <Card
        ref={tableCardRef}
        className="shadow-sm border-gray-200/80 overflow-hidden"
      >
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Nomor Tiket</TableHead>
                  <TableHead scope="col">Waktu Masuk</TableHead>
                  <TableHead scope="col">Waktu Pengambilan</TableHead>
                  <TableHead scope="col">Response Time</TableHead>
                  <TableHead scope="col">Waktu Selesai/Batal</TableHead>
                  <TableHead scope="col">Selisih Waktu</TableHead>
                  <TableHead scope="col">Pelapor</TableHead>
                  <TableHead scope="col">Teknisi</TableHead>
                  <TableHead scope="col">Tipe Masalah</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan="11"
                      className="text-center py-10 text-gray-500"
                    >
                      Tidak ada tiket
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => {
                    const responseTimeMinutes =
                      ticket.pickedUpAt && ticket.createdAt
                        ? Math.round(
                            (new Date(ticket.pickedUpAt) -
                              new Date(ticket.createdAt)) /
                              60000,
                          )
                        : null;
                    const closedAt =
                      (ticket.status === "Selesai" ||
                        ticket.status === "Batal") &&
                      ticket.lastStatusChangeAt
                        ? new Date(ticket.lastStatusChangeAt)
                        : null;
                    const durationMinutes =
                      closedAt && ticket.createdAt
                        ? Math.round(
                            (closedAt - new Date(ticket.createdAt)) / 60000,
                          )
                        : null;
                    return (
                      <TableRow key={ticket.id} data-ticket-row>
                        <TableCell>{ticket.ticketNumber}</TableCell>
                        <TableCell>
                          {new Date(ticket.createdAt).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell>
                          {ticket.pickedUpAt
                            ? new Date(ticket.pickedUpAt).toLocaleString(
                                "id-ID",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {responseTimeMinutes != null
                            ? `${responseTimeMinutes} menit`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {closedAt ? closedAt.toLocaleString("id-ID") : "-"}
                        </TableCell>
                        <TableCell>
                          {durationMinutes != null
                            ? `${durationMinutes} menit`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {ticket.reporterName} - {ticket.reporterUnit}
                        </TableCell>
                        <TableCell>
                          {ticket.assignedTechnician ? (
                            <div className="text-sm">
                              {ticket.assignedTechnician.fullName}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">-</div>
                          )}
                        </TableCell>
                        <TableCell>{ticket.problemType?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticket.status)}>
                            <span className="inline-flex items-center gap-1">
                              {getStatusIcon(ticket.status)}
                              {ticket.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/ticket/${ticket.id}`}
                              aria-label={`Lihat detail tiket ${ticket.ticketNumber}`}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Lihat detail tiket ${ticket.ticketNumber}`}
                              >
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!showAll && (
        <nav
          className="flex justify-center items-center gap-2"
          aria-label="Navigasi halaman tiket"
        >
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            variant="outline"
            aria-label="Halaman berikutnya"
          >
            Selanjutnya
          </Button>
        </nav>
      )}
    </main>
  );
};

export default AllTicketsAdmin;
