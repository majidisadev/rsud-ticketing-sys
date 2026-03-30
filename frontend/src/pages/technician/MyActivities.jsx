import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api, { getBaseUrl } from "../../config/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { toast } from "../../hooks/use-toast";
import { useConfirm } from "../../context/ConfirmContext";
import { Card, CardContent } from "../../components/ui/card";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  ImageIcon,
} from "lucide-react";

const MyActivities = () => {
  const confirm = useConfirm();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [calendarDatesWithDiproses, setCalendarDatesWithDiproses] = useState(
    [],
  );
  const [calendarDatesOnlySelesaiBatal, setCalendarDatesOnlySelesaiBatal] =
    useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityTitle, setActivityTitle] = useState("");
  const [problemTypes, setProblemTypes] = useState([]);
  const [activityProblemTypeId, setActivityProblemTypeId] = useState("");
  const [activityDate, setActivityDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [proofFile, setProofFile] = useState(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState(null);
  const proofFileInputRef = useRef(null);
  const proofPreviewRef = useRef(null);
  const [cardProofLightboxSrc, setCardProofLightboxSrc] = useState(null);

  // Format date to YYYY-MM-DD (local date, avoid UTC shift)
  const formatDate = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

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

  // Fetch activities for selected date
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: formatDate(selectedDate),
      });
      const res = await api.get(`/activities?${params}`);
      setActivities(res.data);
    } catch (error) {
      console.error("Fetch activities error:", error);
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
        year: date.getFullYear(),
      });
      const res = await api.get(`/activities/calendar-dates?${params}`);
      const data = res.data || {};
      const norm = (arr) =>
        (arr || [])
          .map((d) =>
            (typeof d === "string"
              ? d
              : d && d.toISOString
                ? d.toISOString().slice(0, 10)
                : ""
            ).slice(0, 10),
          )
          .filter(Boolean);
      if (Array.isArray(data)) {
        setCalendarDatesWithDiproses(norm(data));
        setCalendarDatesOnlySelesaiBatal([]);
      } else {
        setCalendarDatesWithDiproses(norm(data.datesWithDiproses));
        setCalendarDatesOnlySelesaiBatal(norm(data.datesWithOnlySelesaiBatal));
      }
    } catch (error) {
      console.error("Fetch calendar dates error:", error);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchActivities();
    fetchCalendarDates();
  }, [fetchActivities, fetchCalendarDates]);

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
    return () => {
      if (proofPreviewRef.current) {
        URL.revokeObjectURL(proofPreviewRef.current);
        proofPreviewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cardProofLightboxSrc) return;
    const onKey = (e) => {
      if (e.key === "Escape") setCardProofLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardProofLightboxSrc]);

  const clearProofSelection = () => {
    if (proofPreviewRef.current) {
      URL.revokeObjectURL(proofPreviewRef.current);
      proofPreviewRef.current = null;
    }
    setProofPreviewUrl(null);
    setProofFile(null);
    if (proofFileInputRef.current) proofFileInputRef.current.value = "";
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      clearProofSelection();
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "Ukuran file maksimal 25MB",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    if (proofPreviewRef.current) {
      URL.revokeObjectURL(proofPreviewRef.current);
      proofPreviewRef.current = null;
    }
    const url = URL.createObjectURL(file);
    proofPreviewRef.current = url;
    setProofFile(file);
    setProofPreviewUrl(url);
  };

  const getProofImageSrc = (proofPhotoUrl) =>
    proofPhotoUrl ? `${getBaseUrl()}${proofPhotoUrl}` : null;

  // Group activities by status for Kanban
  const groupedActivities = {
    diproses: activities.filter((a) => a.status === "diproses"),
    selesai: activities.filter((a) => a.status === "selesai"),
    batal: activities.filter((a) => a.status === "batal"),
  };

  // Handle drag end (reorder within same column OR move to different column)
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const activityId = parseInt(draggableId.replace("activity-", ""));
    const sameColumn = destination.droppableId === source.droppableId;

    if (sameColumn) {
      // Reorder within same status column (update local state only)
      const statusKey = source.droppableId;
      const list = groupedActivities[statusKey];
      const reordered = Array.from(list);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);

      const newActivities = [
        ...(statusKey === "diproses" ? reordered : groupedActivities.diproses),
        ...(statusKey === "selesai" ? reordered : groupedActivities.selesai),
        ...(statusKey === "batal" ? reordered : groupedActivities.batal),
      ];
      setActivities(newActivities);
      return;
    }

    // Move to different column (change status) – call API
    const newStatus = destination.droppableId;
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, status: newStatus } : a)),
    );

    try {
      await api.patch(`/activities/${activityId}/status`, {
        status: newStatus,
      });
      fetchActivities();
    } catch (error) {
      console.error("Update status error:", error);
      fetchActivities();
    }
  };

  // Create activity (gunakan tanggal dari kolom tanggal di modal)
  const handleCreateActivity = async () => {
    if (!activityTitle.trim()) return;

    try {
      const formData = new FormData();
      formData.append("title", activityTitle.trim());
      formData.append("currentDate", activityDate);
      formData.append("problemTypeId", activityProblemTypeId || "");
      if (proofFile) formData.append("photo", proofFile);

      await api.post("/activities", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowModal(false);
      setActivityTitle("");
      setActivityProblemTypeId("");
      clearProofSelection();
      fetchActivities();
      fetchCalendarDates();
    } catch (error) {
      console.error("Create activity error:", error);
      toast({
        title: "Gagal membuat aktivitas",
        variant: "destructive",
      });
    }
  };

  // Update activity
  const handleUpdateActivity = async () => {
    if (!activityTitle.trim() || !editingActivity) return;

    try {
      const formData = new FormData();
      formData.append("title", activityTitle.trim());
      formData.append("problemTypeId", activityProblemTypeId || "");
      if (proofFile) formData.append("photo", proofFile);

      await api.put(`/activities/${editingActivity.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowModal(false);
      setActivityTitle("");
      setActivityProblemTypeId("");
      setEditingActivity(null);
      clearProofSelection();
      fetchActivities();
    } catch (error) {
      console.error("Update activity error:", error);
      toast({
        title: "Gagal mengupdate aktivitas",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivityProof = async (activityId, e) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: "Hapus bukti gambar?",
      description: "Bukti gambar akan dihapus permanen dari aktivitas ini.",
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await api.delete(`/activities/${activityId}/proof`);
      await fetchActivities();
      setEditingActivity((prev) =>
        prev && prev.id === activityId
          ? { ...prev, proofPhotoUrl: null }
          : prev,
      );
    } catch (error) {
      console.error("Delete proof error:", error);
      toast({
        title: "Gagal menghapus bukti gambar",
        variant: "destructive",
      });
    }
  };

  // Delete activity
  const handleDeleteActivity = async (id) => {
    const ok = await confirm({
      title: "Hapus aktivitas?",
      description: "Aktivitas ini akan dihapus permanen.",
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await api.delete(`/activities/${id}`);
      fetchActivities();
      fetchCalendarDates();
    } catch (error) {
      console.error("Delete activity error:", error);
      toast({
        title: "Gagal menghapus aktivitas",
        variant: "destructive",
      });
    }
  };

  // Open create modal (default tanggal hari ini)
  const openCreateModal = () => {
    setModalMode("create");
    setActivityTitle("");
    setActivityDate(formatDate(new Date()));
    setEditingActivity(null);
    setActivityProblemTypeId("");
    clearProofSelection();
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (activity) => {
    setModalMode("edit");
    setActivityTitle(activity.title);
    setEditingActivity(activity);
    setActivityProblemTypeId(
      activity.problemType?.id ? String(activity.problemType.id) : "",
    );
    clearProofSelection();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    clearProofSelection();
  };

  // Dot kalender: kuning jika ada aktivitas diproses, abu-abu jika hanya selesai/batal
  const tileContent = ({ date, view }) => {
    if (view === "month") {
      const dateStr = formatDate(date);
      const hasDiproses = calendarDatesWithDiproses.some(
        (cd) => (cd && cd.slice(0, 10)) === dateStr,
      );
      const onlySelesaiBatal = calendarDatesOnlySelesaiBatal.some(
        (cd) => (cd && cd.slice(0, 10)) === dateStr,
      );
      if (hasDiproses) {
        return (
          <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto mt-1"></div>
        );
      }
      if (onlySelesaiBatal) {
        return (
          <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mt-1"></div>
        );
      }
    }
    return null;
  };

  // Handle month change
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    setSelectedDate(activeStartDate);
  };

  // Kanban column component
  const KanbanColumn = ({
    status,
    title,
    icon: Icon,
    activities,
    bgColor,
    borderColor,
  }) => (
    <div className={`flex-1 min-w-[280px] ${bgColor} rounded-lg p-3`}>
      <div
        className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderColor}`}
      >
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {activities.length}
        </Badge>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] space-y-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-gray-100 rounded-lg" : ""
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
                      snapshot.isDragging
                        ? "shadow-lg ring-2 ring-blue-400"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-sm flex-1">
                        {activity.title}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(activity);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteActivity(activity.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                    {activity.proofPhotoUrl && (
                      <div className="relative mt-2">
                        <button
                          type="button"
                          title="Klik untuk pratinjau"
                          className="w-full p-0 border-0 bg-transparent rounded cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardProofLightboxSrc(
                              getProofImageSrc(activity.proofPhotoUrl),
                            );
                          }}
                        >
                          <img
                            src={getProofImageSrc(activity.proofPhotoUrl)}
                            alt="Bukti aktivitas"
                            className="w-full max-h-24 object-cover rounded border border-gray-200 pointer-events-none"
                          />
                        </button>
                        <button
                          type="button"
                          title="Hapus bukti gambar"
                          className="absolute top-1 right-1 p-1 rounded bg-white/90 shadow-sm border border-gray-200 hover:bg-red-50 z-10"
                          onClick={(e) =>
                            handleDeleteActivityProof(activity.id, e)
                          }
                        >
                          <X className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-600">
                      <span className="text-gray-500">Tipe masalah: </span>
                      <span className="font-medium">
                        {activity.problemType?.name || "-"}
                      </span>
                    </div>
                    {activity.endTime && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        {activity.status === "batal" ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span>
                          {activity.status === "batal" ? "Batal" : "Selesai"}:{" "}
                          {formatDateTime(activity.endTime)}
                        </span>
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
          Aktivitas Saya
        </h1>
      </div>

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

      {/* Preview bukti gambar — portal ke body agar menutupi nav (z-30) dan seluruh viewport */}
      {cardProofLightboxSrc &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
            onClick={() => setCardProofLightboxSrc(null)}
            role="presentation"
          >
            <button
              type="button"
              className="fixed top-3 right-3 z-[101] p-2 rounded-full bg-white/15 text-white hover:bg-white/25 sm:top-4 sm:right-4"
              title="Tutup"
              aria-label="Tutup pratinjau"
              onClick={(e) => {
                e.stopPropagation();
                setCardProofLightboxSrc(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={cardProofLightboxSrc}
              alt="Pratinjau bukti"
              className="max-h-[90vh] max-w-full object-contain rounded shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={closeModal}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {modalMode === "create"
                      ? "Tambah Aktivitas"
                      : "Edit Aktivitas"}
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  {modalMode === "create" && (
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
                      Tipe Masalah
                    </label>
                    <Select
                      value={activityProblemTypeId}
                      onChange={(e) => setActivityProblemTypeId(e.target.value)}
                      aria-label="Pilih tipe masalah"
                    >
                      <option value="">- Pilih tipe masalah -</option>
                      {problemTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name}
                        </option>
                      ))}
                    </Select>
                  </div>
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
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                      <ImageIcon className="w-4 h-4" />
                      Bukti gambar (opsional)
                    </label>
                    <Input
                      ref={proofFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProofFileChange}
                      className="cursor-pointer"
                    />
                    {proofPreviewUrl && (
                      <div className="mt-2 flex flex-wrap items-start gap-2">
                        <img
                          src={proofPreviewUrl}
                          alt="Pratinjau bukti"
                          className="max-h-32 rounded border border-gray-200 object-contain"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearProofSelection}
                        >
                          Hapus pilihan file
                        </Button>
                      </div>
                    )}
                    {modalMode === "edit" &&
                      editingActivity?.proofPhotoUrl &&
                      !proofFile && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-gray-500">
                            Bukti saat ini:
                          </p>
                          <div className="relative inline-block max-w-full">
                            <img
                              src={getProofImageSrc(
                                editingActivity.proofPhotoUrl,
                              )}
                              alt="Bukti aktivitas"
                              className="max-h-32 rounded border border-gray-200 object-contain"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() =>
                              handleDeleteActivityProof(editingActivity.id)
                            }
                          >
                            Hapus bukti gambar
                          </Button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <Button
                  onClick={
                    modalMode === "create"
                      ? handleCreateActivity
                      : handleUpdateActivity
                  }
                  disabled={!activityTitle.trim()}
                >
                  {modalMode === "create" ? "Tambah" : "Simpan"}
                </Button>
                <Button variant="outline" onClick={closeModal}>
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
