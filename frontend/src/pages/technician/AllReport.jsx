import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Search, Download, FileText, ImageIcon } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import ImageLightbox from "../../components/ImageLightbox";

const STORAGE_KEY_REPORT = "myActivitiesReportFilters";

const getInitialState = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_REPORT);
    if (raw) {
      const data = JSON.parse(raw);
      const defaults = {
        status: "",
        dateFrom: "",
        dateTo: "",
        search: "",
        problemTypeId: "",
      };
      return {
        reportFilters: { ...defaults, ...(data.reportFilters || {}) },
        reportPage: typeof data.reportPage === "number" ? data.reportPage : 1,
        reportPerPage: [10, 20, 50, 100].includes(Number(data.reportPerPage))
          ? Number(data.reportPerPage)
          : 20,
      };
    }
  } catch (_) {}
  return {
    reportFilters: {
      status: "",
      dateFrom: "",
      dateTo: "",
      search: "",
      problemTypeId: "",
    },
    reportPage: 1,
    reportPerPage: 20,
  };
};

const AllReport = () => {
  const initial = getInitialState();
  const [reportData, setReportData] = useState([]);
  const [reportFilters, setReportFilters] = useState(initial.reportFilters);
  const [reportPage, setReportPage] = useState(initial.reportPage);
  const [reportPerPage, setReportPerPage] = useState(initial.reportPerPage);
  const [problemTypes, setProblemTypes] = useState([]);
  const [proofLightboxSrc, setProofLightboxSrc] = useState(null);
  const reportFiltersEffectSkip = useRef(true);
  const REPORT_PER_PAGE_OPTIONS = [10, 20, 50, 100];

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusVariant = (status) => {
    const variants = {
      diproses: "warning",
      selesai: "success",
      batal: "destructive",
      Diproses: "warning",
      Selesai: "success",
      Batal: "destructive",
      Baru: "default",
    };
    return variants[status] || "secondary";
  };

  const getStatusLabel = (status) => {
    const labels = {
      diproses: "Diproses",
      selesai: "Selesai",
      batal: "Batal",
    };
    return labels[status] || status;
  };

  const fetchReportData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await api.get(`/activities/report?${params}`);
      setReportData(res.data);
    } catch (error) {
      console.error("Fetch report error:", error);
    }
  }, [reportFilters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

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

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY_REPORT,
      JSON.stringify({
        reportFilters,
        reportPage,
        reportPerPage,
      }),
    );
  }, [reportFilters, reportPage, reportPerPage]);

  useEffect(() => {
    if (reportFiltersEffectSkip.current) {
      reportFiltersEffectSkip.current = false;
      return;
    }
    setReportPage(1);
  }, [reportFilters]);

  const reportTotalItems = reportData.length;
  const reportTotalPages = Math.max(
    1,
    Math.ceil(reportTotalItems / reportPerPage),
  );
  const reportPageSafe = Math.min(Math.max(1, reportPage), reportTotalPages);
  const reportPaginatedData = reportData.slice(
    (reportPageSafe - 1) * reportPerPage,
    reportPageSafe * reportPerPage,
  );

  const handleReportPerPageChange = (value) => {
    const num = parseInt(value, 10);
    setReportPerPage(num);
    setReportPage(1);
  };

  const resolveProofImageUrl = (proofPhotoUrl) => {
    if (!proofPhotoUrl || typeof proofPhotoUrl !== "string") return null;
    if (proofPhotoUrl.startsWith("http")) return proofPhotoUrl;
    return `${getBaseUrl()}${proofPhotoUrl}`;
  };

  const handleViewProof = (item) => {
    const src = resolveProofImageUrl(item.proofPhotoUrl);
    if (!src) {
      toast({
        title: "Tidak ada bukti gambar",
        description: "Belum ada foto bukti untuk entri ini.",
      });
      return;
    }
    setProofLightboxSrc(src);
  };

  const handleExportReport = async (type) => {
    try {
      const params = new URLSearchParams();
      Object.entries(reportFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const token = localStorage.getItem("token");
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/activities/report/export/${type}?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Export gagal" }));
        throw new Error(errorData.message || "Export gagal");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `laporan-aktivitas.${type === "excel" ? "xlsx" : "pdf"}`;
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          Laporan
        </h1>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => handleExportReport("excel")}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            onClick={() => handleExportReport("pdf")}
            variant="destructive"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari judul/deskripsi..."
                  value={reportFilters.search}
                  onChange={(e) =>
                    setReportFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  className="pl-10"
                />
              </div>
              <StatusFilterSelect
                variant="activity"
                value={reportFilters.status}
                onChange={(v) =>
                  setReportFilters((prev) => ({ ...prev, status: v }))
                }
                aria-label="Filter status laporan"
              />
              <Select
                value={reportFilters.problemTypeId}
                onChange={(e) =>
                  setReportFilters((prev) => ({
                    ...prev,
                    problemTypeId: e.target.value,
                  }))
                }
                aria-label="Filter tipe masalah laporan"
              >
                <option value="">Semua Tipe Masalah</option>
                {problemTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={reportFilters.dateFrom}
                onChange={(e) =>
                  setReportFilters((prev) => ({
                    ...prev,
                    dateFrom: e.target.value,
                  }))
                }
                placeholder="Dari Tanggal"
              />
              <Input
                type="date"
                value={reportFilters.dateTo}
                onChange={(e) =>
                  setReportFilters((prev) => ({
                    ...prev,
                    dateTo: e.target.value,
                  }))
                }
                placeholder="Sampai Tanggal"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Tampilkan</span>
            <Select
              value={String(reportPerPage)}
              onChange={(e) => handleReportPerPageChange(e.target.value)}
              className="w-20"
            >
              {REPORT_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <span className="text-sm text-gray-600">per halaman</span>
          </div>
          {reportTotalItems > 0 && (
            <div className="text-sm text-gray-600">
              Menampilkan {(reportPageSafe - 1) * reportPerPage + 1}–
              {Math.min(reportPageSafe * reportPerPage, reportTotalItems)} dari{" "}
              {reportTotalItems} data
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Waktu Masuk</TableHead>
                  <TableHead>Waktu Selesai/Batal</TableHead>
                  <TableHead>Selisih Waktu</TableHead>
                  <TableHead>Judul Aktivitas / Deskripsi Masalah</TableHead>
                  <TableHead>Tipe Masalah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[88px] text-center">Bukti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportPaginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan="8"
                      className="text-center py-8 text-gray-500"
                    >
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  reportPaginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge
                          variant={
                            item.type === "activity" ? "outline" : "secondary"
                          }
                        >
                          {item.type === "activity" ? "Aktivitas" : "Tugas"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(item.entryTime || item.startTime)}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(item.completedAt || item.endTime)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {item.durationMinutes != null
                          ? `${item.durationMinutes} menit`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="truncate">{item.title}</p>
                          {item.type === "ticket" && item.ticketNumber && (
                            <p className="text-xs text-gray-500">
                              {item.ticketNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="truncate inline-block max-w-[180px]">
                          {item.problemTypeName || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-gray-600 hover:text-blue-600"
                          aria-label="Lihat bukti gambar"
                          title="Lihat bukti"
                          onClick={() => handleViewProof(item)}
                        >
                          <ImageIcon className="h-5 w-5" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                        variant={reportPageSafe === p ? "default" : "outline"}
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
                onClick={() =>
                  setReportPage((p) => Math.min(reportTotalPages, p + 1))
                }
                disabled={reportPageSafe >= reportTotalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImageLightbox
        src={proofLightboxSrc}
        alt="Bukti gambar"
        onClose={() => setProofLightboxSrc(null)}
      />
    </div>
  );
};

export default AllReport;
