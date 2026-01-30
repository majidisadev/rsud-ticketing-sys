import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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
} from "lucide-react";
import html2canvas from "html2canvas";

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

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/tickets/track/${ticketNumber}`);
        setTicket(res.data);
        // Fetch technicians based on ticket category
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

  const handleCopyTicketNumber = async () => {
    if (!ticket || !ticket.ticketNumber) {
      console.error("Ticket number not available");
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(ticket.ticketNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement("textarea");
        textArea.value = ticket.ticketNumber;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand("copy");
          if (successful) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else {
            throw new Error("Copy command failed");
          }
        } catch (err) {
          console.error("Failed to copy:", err);
          alert(
            "Gagal menyalin nomor tiket. Silakan salin secara manual: " +
              ticket.ticketNumber
          );
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback: show alert with ticket number
      alert(
        "Gagal menyalin nomor tiket. Silakan salin secara manual: " +
          ticket.ticketNumber
      );
    }
  };

  const handleSaveAsImage = async () => {
    if (!ticketRef.current) return;

    try {
      // Hide buttons temporarily during capture
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "none";
      if (whatsappButton) whatsappButton.style.display = "none";

      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#f9fafb",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Restore button visibility
      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";

      const link = document.createElement("a");
      link.download = `tiket-${ticket.ticketNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to save image:", err);
      alert("Gagal menyimpan gambar");
      // Restore button visibility in case of error
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");
    // If starts with 0, replace with 62
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.substring(1);
    }
    // If doesn't start with country code, add 62
    if (!cleaned.startsWith("62")) {
      cleaned = "62" + cleaned;
    }
    return cleaned;
  };

  const generateTicketImage = async () => {
    if (!ticketRef.current) return null;

    try {
      // Hide buttons temporarily during capture
      const saveButton = document.querySelector("[data-save-button]");
      const whatsappButton = document.querySelector("[data-whatsapp-button]");
      if (saveButton) saveButton.style.display = "none";
      if (whatsappButton) whatsappButton.style.display = "none";

      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#f9fafb",
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Restore button visibility
      if (saveButton) saveButton.style.display = "";
      if (whatsappButton) whatsappButton.style.display = "";

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Failed to generate image:", err);
      // Restore button visibility in case of error
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
    if (!technician || !technician.phoneNumber) {
      alert("Teknisi tidak memiliki nomor WhatsApp");
      return;
    }

    setGeneratingImage(true);

    try {
      // Generate ticket image
      const imageDataUrl = await generateTicketImage();

      // Format phone number
      const formattedPhone = formatPhoneNumber(technician.phoneNumber);
      if (!formattedPhone) {
        alert("Nomor telepon tidak valid");
        return;
      }

      // Create WhatsApp message
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

      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);

      // Create WhatsApp link
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

      // Open WhatsApp
      window.open(whatsappUrl, "_blank");

      // If image was generated, download it so user can attach manually
      if (imageDataUrl) {
        const link = document.createElement("a");
        link.download = `tiket-${ticket.ticketNumber}.png`;
        link.href = imageDataUrl;
        // Small delay to ensure WhatsApp opens first
        setTimeout(() => {
          link.click();
        }, 500);
      }

      // Close modal
      setShowWhatsAppModal(false);
      setSelectedTechnician("");
    } catch (err) {
      console.error("Failed to send to WhatsApp:", err);
      alert("Gagal mengirim ke WhatsApp");
    } finally {
      setGeneratingImage(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Tiket Tidak Ditemukan
            </h1>
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
      <div className="max-w-4xl mx-auto space-y-6" ref={ticketRef}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle>Detail Tiket</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-600">{ticket.ticketNumber}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTicketNumber}
                    className="h-6 w-6 p-0"
                    title="Salin nomor tiket"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAsImage}
                  className="flex items-center gap-2"
                  data-save-button
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Simpan sebagai Gambar
                  </span>
                </Button>
                {technicians.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWhatsAppModal(true)}
                    className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                    data-whatsapp-button
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Kirim ke WhatsApp</span>
                  </Button>
                )}
                <Badge variant={getStatusVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>
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
                <p className="font-medium">
                  {new Date(ticket.createdAt).toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teknisi</p>
                <p className="font-medium">
                  {ticket.assignedTechnician
                    ? `${ticket.assignedTechnician.fullName}${
                        ticket.assignedTechnician.phoneNumber
                          ? ` - ${ticket.assignedTechnician.phoneNumber}`
                          : ""
                      }`
                    : "-"}
                  {ticket.coAssignments && ticket.coAssignments.length > 0 && (
                    <span className="text-gray-500 ml-2">
                      (+{" "}
                      {ticket.coAssignments
                        .map((ca) =>
                          ca.technician
                            ? `${ca.technician.fullName}${
                                ca.technician.phoneNumber
                                  ? ` - ${ca.technician.phoneNumber}`
                                  : ""
                              }`
                            : null
                        )
                        .filter(Boolean)
                        .join(", ")}
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Deskripsi Masalah</p>
              <p className="text-gray-800 whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {ticket.photoUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Foto Masalah</p>
                <img
                  src={`${getBaseUrl()}${ticket.photoUrl}?t=${
                    ticket.updatedAt || Date.now()
                  }`}
                  alt="Foto masalah"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                    console.error("Image load error:", ticket.photoUrl);
                  }}
                />
              </div>
            )}

            {ticket.proofPhotoUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Bukti Perbaikan</p>
                <img
                  src={`${getBaseUrl()}${ticket.proofPhotoUrl}?t=${
                    ticket.updatedAt || Date.now()
                  }`}
                  alt="Bukti perbaikan"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = "/placeholder-image.png";
                    console.error("Image load error:", ticket.proofPhotoUrl);
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
                  <div
                    key={action.id}
                    className="border-l-4 border-blue-500 pl-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800 capitalize">
                          {action.actionType.replace("-", " ")}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {action.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          oleh {action.creator?.fullName || "System"} -{" "}
                          {new Date(action.createdAt).toLocaleString("id-ID")}
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

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Kirim Tiket ke WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">
                    Pilih Teknisi {ticket.category}
                  </Label>
                  <Select
                    id="technician"
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    disabled={generatingImage}
                  >
                    <option value="">Pilih Teknisi</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullName}{" "}
                        {tech.phoneNumber ? `(${tech.phoneNumber})` : ""}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Detail tiket akan dikirim sebagai pesan teks ke
                    nomor WhatsApp teknisi yang dipilih.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendToWhatsApp}
                    disabled={!selectedTechnician || generatingImage}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {generatingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Kirim ke WhatsApp
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowWhatsAppModal(false);
                      setSelectedTechnician("");
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={generatingImage}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TrackTicket;
