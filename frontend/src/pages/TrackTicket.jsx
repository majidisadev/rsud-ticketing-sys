import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { createTimeline, set, stagger, animate as animeAnimate } from "animejs";
import api, { getBaseUrl } from "../config/api";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import {
  AlertCircle,
  Copy,
  Download,
  Check,
  MessageCircle,
  User,
  Building2,
  Phone,
  Calendar,
  Wrench,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  Home,
} from "lucide-react";
import html2canvas from "html2canvas";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TrackTicket = () => {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const ticketRef = useRef(null);
  const mainRef = useRef(null);
  const cardRef = useRef(null);
  const detailItemsRef = useRef([]);
  const actionsRef = useRef([]);
  const modalRef = useRef(null);
  const modalCardRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/tickets/track/${ticketNumber}`);
        setTicket(res.data);
        if (res.data?.category) {
          fetchTechnicians(res.data.category);
        }
      } catch (err) {
        setError("Tiket tidak ditemukan");
      } finally {
        setLoading(false);
      }
    };

    if (ticketNumber) {
      fetchTicket();
    }
  }, [ticketNumber]);

  const fetchTechnicians = async (category) => {
    try {
      const res = await api.get(`/users/public/technicians/${category}`);
      setTechnicians(res.data);
    } catch (error) {
      console.error("Fetch technicians error:", error);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      Baru: "default",
      Diproses: "warning",
      Selesai: "success",
      Batal: "destructive",
    };
    return variants[status] || "secondary";
  };

  const getStatusLabel = (status) => {
    const labels = {
      Baru: "Tiket baru",
      Diproses: "Sedang diproses",
      Selesai: "Selesai",
      Batal: "Dibatalkan",
    };
    return labels[status] || status;
  };

  const handleCopyTicketNumber = async () => {
    if (!ticket?.ticketNumber) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ticket.ticketNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = ticket.ticketNumber;
        textArea.setAttribute("aria-hidden", "true");
        textArea.style.cssText =
          "position:fixed;left:-9999px;top:-9999px;opacity:0;";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          alert("Gagal menyalin. Salin manual: " + ticket.ticketNumber);
        }
      }
    } catch (err) {
      alert("Gagal menyalin. Salin manual: " + ticket.ticketNumber);
    }
  };

  const handleSaveAsImage = async () => {
    if (!ticketRef.current) return;
    try {
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "none";
      if (whatsappButton) whatsappButton.style.display = "none";

      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#f8fafc",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";

      const link = document.createElement("a");
      link.download = `tiket-${ticket.ticketNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";
      alert("Gagal menyimpan gambar");
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = "62" + cleaned.substring(1);
    if (!cleaned.startsWith("62")) cleaned = "62" + cleaned;
    return cleaned;
  };

  const generateTicketImage = async () => {
    if (!ticketRef.current) return null;
    try {
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "none";
      if (whatsappButton) whatsappButton.style.display = "none";

      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#f8fafc",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";
      return canvas.toDataURL("image/png");
    } catch (err) {
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";
      return null;
    }
  };

  const handleSendToWhatsApp = async () => {
    if (!selectedTechnician) {
      alert("Pilih teknisi terlebih dahulu");
      return;
    }
    const technician = technicians.find(
      (t) => t.id === parseInt(selectedTechnician)
    );
    if (!technician?.phoneNumber) {
      alert("Teknisi tidak memiliki nomor WhatsApp");
      return;
    }

    setGeneratingImage(true);
    try {
      const imageDataUrl = await generateTicketImage();
      const formattedPhone = formatPhoneNumber(technician.phoneNumber);
      if (!formattedPhone) {
        alert("Nomor telepon tidak valid");
        return;
      }

      const trackingUrl = `${window.location.origin}/track/${ticket.ticketNumber}`;
      const message =
        `*Detail Tiket*\n\n` +
        `Nomor Tiket: ${ticket.ticketNumber}\n` +
        `Kategori: ${ticket.category}\n` +
        `Status: ${ticket.status}\n` +
        `Pelapor: ${ticket.reporterName}\n` +
        `Unit: ${ticket.reporterUnit}\n` +
        `Tanggal: ${new Date(ticket.createdAt).toLocaleString("id-ID")}\n\n` +
        `Deskripsi:\n${ticket.description}\n\n` +
        `Lihat detail lengkap: ${trackingUrl}`;

      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      if (imageDataUrl) {
        const link = document.createElement("a");
        link.download = `tiket-${ticket.ticketNumber}.png`;
        link.href = imageDataUrl;
        setTimeout(() => link.click(), 500);
      }

      setShowWhatsAppModal(false);
      setSelectedTechnician("");
    } catch (err) {
      alert("Gagal mengirim ke WhatsApp");
    } finally {
      setGeneratingImage(false);
    }
  };

  const openModal = useCallback(() => {
    previousFocusRef.current = document.activeElement;
    setShowWhatsAppModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowWhatsAppModal(false);
    setSelectedTechnician("");
    if (previousFocusRef.current?.focus) {
      previousFocusRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!showWhatsAppModal) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) firstFocusable.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showWhatsAppModal, closeModal]);

  useEffect(() => {
    if (loading || error || !ticket || prefersReducedMotion()) return;

    const card = cardRef.current;
    const detailEls = detailItemsRef.current.filter(Boolean);
    const actionEls = actionsRef.current.filter(Boolean);

    if (!card) return;

    set(card, { opacity: 0, y: 20 });
    set(detailEls, { opacity: 0, y: 10 });
    set(actionEls, { opacity: 0, x: -8 });

    const tl = createTimeline({ defaults: { ease: "outExpo", duration: 400 } });
    tl.add(card, {
      opacity: { to: 1 },
      y: { to: 0 },
      duration: 500,
    }).add(
      detailEls,
      {
        opacity: { to: 1 },
        y: { to: 0 },
        duration: 320,
        delay: stagger(50),
      },
      "-=200"
    );

    if (actionEls.length) {
      tl.add(
        actionEls,
        {
          opacity: { to: 1 },
          x: { to: 0 },
          duration: 300,
          delay: stagger(60),
        },
        "-=100"
      );
    }

    return () => tl.pause();
  }, [loading, error, ticket]);

  useEffect(() => {
    if (!showWhatsAppModal || prefersReducedMotion()) return;
    const backdrop = modalRef.current;
    const card = modalCardRef.current;
    if (!backdrop || !card) return;

    set(backdrop, { opacity: 0 });
    set(card, { opacity: 0, scale: 0.95 });
    animeAnimate(backdrop, { opacity: { to: 1 } }, { duration: 200 });
    animeAnimate(
      card,
      { opacity: { to: 1 }, scale: { to: 1 } },
      { duration: 280, ease: "outExpo" }
    );
  }, [showWhatsAppModal]);

  if (loading) {
    return (
      <main
        className="min-h-screen bg-slate-50 flex items-center justify-center px-4"
        aria-live="polite"
        aria-busy="true"
        aria-label="Memuat detail tiket"
      >
        <div className="w-full max-w-md space-y-6" role="status">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mx-auto" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-4 w-24 bg-slate-100 rounded shrink-0" />
                  <div className="h-4 flex-1 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-slate-500 text-sm sr-only">
            Memuat data tiket, harap tunggu.
          </p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main
        className="min-h-screen bg-slate-50 flex items-center justify-center px-4"
        aria-live="polite"
      >
        <Card className="max-w-md w-full shadow-lg border-slate-200">
          <CardContent className="p-8 text-center">
            <div
              className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"
              aria-hidden
            >
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">
              Tiket Tidak Ditemukan
            </h1>
            <p className="text-slate-600 text-sm mb-6">
              Nomor tiket tidak valid atau telah dihapus. Periksa kembali URL atau
              buat tiket baru.
            </p>
            <a href="/">
              <Button
                variant="outline"
                className="gap-2"
                aria-label="Kembali ke beranda"
              >
                <Home className="w-4 h-4" />
                Kembali ke Beranda
              </Button>
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  const detailRows = [
    {
      label: "Kategori",
      value: ticket.category,
      icon: FileText,
    },
    {
      label: "Pelapor",
      value: ticket.reporterName,
      icon: User,
    },
    {
      label: "Unit/Ruangan",
      value: ticket.reporterUnit,
      icon: Building2,
    },
    {
      label: "Nomor Telepon",
      value: ticket.reporterPhone,
      icon: Phone,
    },
    {
      label: "Tanggal Masuk",
      value: new Date(ticket.createdAt).toLocaleString("id-ID"),
      icon: Calendar,
    },
    {
      label: "Teknisi",
      value: ticket.assignedTechnician
        ? `${ticket.assignedTechnician.fullName}${
            ticket.assignedTechnician.phoneNumber
              ? ` – ${ticket.assignedTechnician.phoneNumber}`
              : ""
          }${ticket.coAssignments?.length ? ` (+ ${ticket.coAssignments.map((ca) => ca.technician?.fullName).filter(Boolean).join(", ")})` : ""}`
        : "–",
      icon: Wrench,
    },
  ];

  return (
    <main
      ref={mainRef}
      className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 sm:py-10 px-4 sm:px-6 lg:px-8"
      id="main-content"
      aria-label="Detail tiket"
    >
      <div className="max-w-3xl mx-auto space-y-6" ref={ticketRef}>
        <Card
          ref={cardRef}
          className="overflow-hidden border-slate-200 shadow-sm bg-white/95 backdrop-blur"
        >
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl text-slate-800 mb-1">
                  Detail Tiket
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <code
                    className="text-sm font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded"
                    aria-label={`Nomor tiket ${ticket.ticketNumber}`}
                  >
                    {ticket.ticketNumber}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTicketNumber}
                    className="h-8 w-8 p-0 rounded-md"
                    aria-label={copied ? "Nomor tiket disalin" : "Salin nomor tiket"}
                    title={copied ? "Disalin" : "Salin nomor tiket"}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-500" aria-hidden />
                    )}
                  </Button>
                  {copied && (
                    <span
                      className="text-xs text-emerald-600 font-medium"
                      role="status"
                      aria-live="polite"
                    >
                      Disalin
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsImage}
                  className="gap-2 border-slate-200"
                  data-save-button
                  aria-label="Simpan tiket sebagai gambar"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Simpan Gambar</span>
                </Button>
                {technicians.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openModal}
                    className="gap-2 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
                    data-whatsapp-button
                    aria-label="Kirim tiket ke WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                )}
                <Badge
                  variant={getStatusVariant(ticket.status)}
                  className="shrink-0 font-medium"
                  aria-label={`Status: ${getStatusLabel(ticket.status)}`}
                >
                  {ticket.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <section aria-labelledby="detail-heading" className="mb-6">
              <h2
                id="detail-heading"
                className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4"
              >
                Informasi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {detailRows.map((row, i) => (
                  <div
                    key={row.label}
                    ref={(el) => {
                      detailItemsRef.current[i] = el;
                    }}
                    className="flex gap-3 p-3 rounded-lg bg-slate-50/80 border border-slate-100"
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500"
                      aria-hidden
                    >
                      <row.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 font-medium">
                        {row.label}
                      </p>
                      <p className="text-slate-800 font-medium truncate" title={row.value}>
                        {row.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="desc-heading" className="mb-6">
              <h2
                id="desc-heading"
                className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" aria-hidden />
                Deskripsi Masalah
              </h2>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
              </div>
            </section>

            {ticket.photoUrl && (
              <section aria-labelledby="photo-heading" className="mb-6">
                <h2
                  id="photo-heading"
                  className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" aria-hidden />
                  Foto Masalah
                </h2>
                <img
                  src={`${getBaseUrl()}${ticket.photoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Foto masalah yang dilaporkan"
                  className="w-full max-w-lg rounded-lg border border-slate-200 shadow-sm object-cover"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                    e.target.alt = "Gambar tidak dapat dimuat";
                  }}
                />
              </section>
            )}

            {ticket.proofPhotoUrl && (
              <section aria-labelledby="proof-heading" className="mb-6">
                <h2
                  id="proof-heading"
                  className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" aria-hidden />
                  Bukti Perbaikan
                </h2>
                <img
                  src={`${getBaseUrl()}${ticket.proofPhotoUrl}?t=${ticket.updatedAt || Date.now()}`}
                  alt="Bukti perbaikan telah dilakukan"
                  className="w-full max-w-lg rounded-lg border border-slate-200 shadow-sm object-cover"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                    e.target.alt = "Gambar tidak dapat dimuat";
                  }}
                />
              </section>
            )}
          </CardContent>
        </Card>

        {ticket.actions && ticket.actions.length > 0 && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-slate-500" aria-hidden />
                Riwayat Tindakan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-4" aria-label="Daftar riwayat tindakan">
                {ticket.actions.map((action, i) => (
                  <li
                    key={action.id}
                    ref={(el) => {
                      actionsRef.current[i] = el;
                    }}
                    className="border-l-4 border-slate-300 pl-4 py-2 rounded-r-lg bg-slate-50/50"
                  >
                    <p className="font-medium text-slate-800 capitalize">
                      {action.actionType.replace("-", " ")}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {action.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      oleh {action.creator?.fullName || "System"} ·{" "}
                      {new Date(action.createdAt).toLocaleString("id-ID")}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-2">
          <a href="/">
            <Button
              variant="outline"
              className="gap-2 border-slate-200"
              aria-label="Kembali ke beranda"
            >
              <Home className="w-4 h-4" aria-hidden />
              Kembali ke Beranda
            </Button>
          </a>
        </div>
      </div>

      {showWhatsAppModal && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-modal-title"
          aria-describedby="whatsapp-modal-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <Card
            ref={modalCardRef}
            className="max-w-md w-full shadow-xl border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="whatsapp-modal-title">
                Kirim Tiket ke WhatsApp
              </CardTitle>
              <p id="whatsapp-modal-desc" className="text-sm text-slate-600 mt-1">
                Pilih teknisi dan kirim detail tiket ke nomor WhatsApp mereka.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="technician-select">
                    Pilih Teknisi {ticket.category}
                  </Label>
                  <Select
                    id="technician-select"
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    disabled={generatingImage}
                    aria-describedby="technician-hint"
                  >
                    <option value="">Pilih Teknisi</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullName}
                        {tech.phoneNumber ? ` (${tech.phoneNumber})` : ""}
                      </option>
                    ))}
                  </Select>
                  <p id="technician-hint" className="text-xs text-slate-500">
                    Detail tiket akan dikirim sebagai pesan ke WhatsApp teknisi.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendToWhatsApp}
                    disabled={!selectedTechnician || generatingImage}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                    aria-busy={generatingImage}
                  >
                    {generatingImage ? (
                      <>
                        <span
                          className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                          aria-hidden
                        />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" aria-hidden />
                        Kirim ke WhatsApp
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={closeModal}
                    variant="outline"
                    className="flex-1"
                    disabled={generatingImage}
                    aria-label="Tutup dialog"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
};

export default TrackTicket;
