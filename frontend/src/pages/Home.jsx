import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTimeline, set, stagger } from 'animejs';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { AlertCircle, Ticket, Search, LogIn, LayoutGrid } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mainRef = useRef(null);
  const headerRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const actionsRef = useRef(null);
  const cardReportRef = useRef(null);
  const cardTrackRef = useRef(null);

  const [formData, setFormData] = useState({
    reporterName: '',
    reporterUnit: '',
    reporterPhone: '',
    category: 'SIMRS',
    description: '',
    photo: null
  });
  const [searchTicket, setSearchTicket] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedOptions, setSavedOptions] = useState({
    reporterNames: [],
    reporterUnits: [],
    reporterPhones: []
  });
  const [ipsrsEnabled, setIpsrsEnabled] = useState(false);

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const loadSavedOptions = () => {
      try {
        const savedNames = JSON.parse(localStorage.getItem('savedReporterNames') || '[]');
        const savedUnits = JSON.parse(localStorage.getItem('savedReporterUnits') || '[]');
        const savedPhones = JSON.parse(localStorage.getItem('savedReporterPhones') || '[]');
        setSavedOptions({
          reporterNames: savedNames,
          reporterUnits: savedUnits,
          reporterPhones: savedPhones
        });
      } catch (err) {
        console.error('Error loading saved options:', err);
      }
    };
    loadSavedOptions();
    fetchIpsrsStatus();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const header = headerRef.current;
    const logo = logoRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const actions = actionsRef.current;
    const cardReport = cardReportRef.current;
    const cardTrack = cardTrackRef.current;

    if (!header || !logo || !title || !subtitle || !actions || !cardReport || !cardTrack) return;

    set([header, logo, title, subtitle, actions, cardReport, cardTrack], { opacity: 0 });
    set(logo, { opacity: 0, scale: 0.92 });
    set(title, { opacity: 0, y: 12 });
    set(subtitle, { opacity: 0, y: 8 });
    set(actions, { opacity: 0, y: 8 });
    set([cardReport, cardTrack], { opacity: 0, y: 24 });

    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 600 } });

    tl.add(header, { opacity: { to: 1 }, duration: 400 })
      .add(logo, { opacity: { to: 1 }, scale: { to: 1 }, duration: 500 }, '-=200')
      .add(title, { opacity: { to: 1 }, y: { to: 0 }, duration: 450 }, '-=300')
      .add(subtitle, { opacity: { to: 1 }, y: { to: 0 }, duration: 400 }, '-=250')
      .add(actions, { opacity: { to: 1 }, y: { to: 0 }, duration: 400 }, '-=200')
      .add(
        [cardReport, cardTrack],
        { opacity: { to: 1 }, y: { to: 0 }, duration: 500, delay: stagger(120) },
        '-=150'
      );
  }, []);

  const fetchIpsrsStatus = async () => {
    try {
      const res = await api.get('/settings/public/ipsrs-enabled');
      setIpsrsEnabled(res.data.ipsrsEnabled);
      if (!res.data.ipsrsEnabled && formData.category === 'IPSRS') {
        setFormData(prev => ({ ...prev, category: 'SIMRS' }));
      }
    } catch (err) {
      console.error('Fetch IPSRS status error:', err);
    }
  };

  const saveToLocalStorage = (key, value) => {
    if (!value || value.trim() === '') return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      const trimmedValue = value.trim();
      const filtered = saved.filter(item => item !== trimmedValue);
      const updated = [trimmedValue, ...filtered].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
      if (key === 'savedReporterNames') {
        setSavedOptions(prev => ({ ...prev, reporterNames: updated }));
      } else if (key === 'savedReporterUnits') {
        setSavedOptions(prev => ({ ...prev, reporterUnits: updated }));
      } else if (key === 'savedReporterPhones') {
        setSavedOptions(prev => ({ ...prev, reporterPhones: updated }));
      }
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      if (e.target.files[0].size > 25 * 1024 * 1024) {
        setError('Ukuran file maksimal 25MB');
        return;
      }
      setFormData(prev => ({ ...prev, photo: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });
      const res = await api.post('/tickets', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      saveToLocalStorage('savedReporterNames', formData.reporterName);
      saveToLocalStorage('savedReporterUnits', formData.reporterUnit);
      saveToLocalStorage('savedReporterPhones', formData.reporterPhone);
      navigate(`/track/${res.data.ticketNumber}`);
    } catch (err) {
      console.error('Error creating ticket:', err);
      if (err.code === 'ECONNREFUSED' || err.message === 'Network Error') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        setError(`Tidak dapat terhubung ke server. Pastikan backend berjalan di ${protocol}//${hostname}:5000`);
      } else {
        setError(err.response?.data?.message || err.message || 'Terjadi kesalahan');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTicket.trim()) {
      navigate(`/track/${searchTicket.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* Decorative background */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="absolute top-1/2 -left-32 h-64 w-64 rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-48 w-48 rounded-full bg-sky-100/40 blur-2xl" />
      </div>

      {/* Skip to main content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:w-auto focus:h-auto focus:overflow-visible focus:whitespace-normal focus:[clip:auto] focus:[margin:0]"
      >
        Loncat ke konten utama
      </a>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Header */}
        <header
          ref={headerRef}
          className="text-center mb-8 sm:mb-10"
          aria-label="Header halaman utama"
        >
          <div ref={logoRef} className="flex justify-center items-center mb-5">
            <img
              src={`${import.meta.env.BASE_URL}logo192.png`}
              alt="Logo RSUD"
              className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain drop-shadow-sm"
              width="96"
              height="96"
              fetchpriority="high"
            />
          </div>
          <h1
            ref={titleRef}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 tracking-tight mb-3"
          >
            Sistem Ticketing RSUD
          </h1>
          <p
            ref={subtitleRef}
            className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed"
          >
            Laporkan masalah dan lacak status tiket Anda dengan mudah
          </p>
        </header>

        {/* Actions: Login & All Tickets */}
        <div
          ref={actionsRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 sm:mb-10"
          role="group"
          aria-label="Aksi cepat"
        >
          {user && (user.role === 'admin' || user.role === 'teknisi_simrs' || user.role === 'teknisi_ipsrs') ? (
            <Button
              onClick={() => navigate(user.role === 'admin' ? '/admin/tickets' : '/technician/all-tasks')}
              variant="default"
              className="min-w-[180px] bg-slate-700 hover:bg-slate-800 focus-visible:ring-slate-400"
              aria-label="Buka daftar semua tiket"
            >
              <LayoutGrid className="w-4 h-4 mr-2" aria-hidden />
              Semua Tiket
            </Button>
          ) : null}
          <a href="/login" className="inline-block">
            <Button
              variant="default"
              className="min-w-[180px] bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-400"
              aria-label="Login untuk admin atau teknisi"
            >
              <LogIn className="w-4 h-4 mr-2" aria-hidden />
              Login Admin/Teknisi
            </Button>
          </a>
        </div>

        <main
          id="main-content"
          ref={mainRef}
          className="max-w-4xl mx-auto"
          role="main"
          aria-label="Konten utama"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Report Form Card */}
            <Card
              ref={cardReportRef}
              className="border-slate-200/80 bg-white/90 backdrop-blur shadow-lg shadow-slate-200/50 rounded-xl overflow-hidden transition-shadow hover:shadow-xl hover:shadow-slate-200/60 focus-within:ring-2 focus-within:ring-teal-500/30 focus-within:ring-offset-2"
              aria-labelledby="card-report-title"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600" aria-hidden>
                    <Ticket className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle id="card-report-title" className="text-xl text-slate-800">
                      Laporkan Masalah
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-0.5">
                      Isi formulir untuk membuat tiket baru
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-describedby={error ? 'form-error' : undefined}>
                  <div className="space-y-2">
                    <Label htmlFor="reporterName" className="text-slate-700">
                      Nama Pelapor <span className="text-red-500" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="reporterName"
                      name="reporterName"
                      list="reporterNameOptions"
                      value={formData.reporterName}
                      onChange={handleInputChange}
                      placeholder="Ketik atau pilih dari daftar"
                      required
                      autoComplete="name"
                      className="border-slate-300 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                      aria-required="true"
                    />
                    <datalist id="reporterNameOptions">
                      {savedOptions.reporterNames.map((name, index) => (
                        <option key={index} value={name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reporterUnit" className="text-slate-700">
                      Unit/Ruangan <span className="text-red-500" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="reporterUnit"
                      name="reporterUnit"
                      list="reporterUnitOptions"
                      value={formData.reporterUnit}
                      onChange={handleInputChange}
                      placeholder="Ketik atau pilih dari daftar"
                      required
                      autoComplete="organization-unit"
                      className="border-slate-300 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                      aria-required="true"
                    />
                    <datalist id="reporterUnitOptions">
                      {savedOptions.reporterUnits.map((unit, index) => (
                        <option key={index} value={unit} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reporterPhone" className="text-slate-700">
                      Nomor Telp/WA <span className="text-red-500" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="reporterPhone"
                      name="reporterPhone"
                      type="tel"
                      list="reporterPhoneOptions"
                      value={formData.reporterPhone}
                      onChange={handleInputChange}
                      placeholder="Ketik atau pilih dari daftar"
                      required
                      autoComplete="tel"
                      className="border-slate-300 focus-visible:ring-teal-500 focus-visible:border-teal-500"
                      aria-required="true"
                    />
                    <datalist id="reporterPhoneOptions">
                      {savedOptions.reporterPhones.map((phone, index) => (
                        <option key={index} value={phone} />
                      ))}
                    </datalist>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-slate-700">
                      Kategori <span className="text-red-500" aria-hidden>*</span>
                    </legend>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value="SIMRS"
                          checked={formData.category === 'SIMRS'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                          required
                          aria-required="true"
                        />
                        <span className="text-slate-700">IT/SIMRS</span>
                      </label>
                      {ipsrsEnabled && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="category"
                            value="IPSRS"
                            checked={formData.category === 'IPSRS'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                            aria-required="true"
                          />
                          <span className="text-slate-700">IPSRS</span>
                        </label>
                      )}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-700">
                      Deskripsi Masalah <span className="text-red-500" aria-hidden>*</span>
                    </Label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows="4"
                      placeholder="Jelaskan masalah yang Anda alami..."
                      className="flex min-h-[88px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-required="true"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photo" className="text-slate-700">
                      Upload Foto <span className="text-slate-500 font-normal">(Opsional, maks. 25MB)</span>
                    </Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="border-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-teal-700 file:text-sm"
                      aria-describedby="photo-hint"
                    />
                    <p id="photo-hint" className="text-xs text-slate-500">
                      Format: JPG, PNG, atau GIF
                    </p>
                  </div>

                  {error && (
                    <div
                      id="form-error"
                      role="alert"
                      className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2"
                      aria-live="polite"
                    >
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-400 h-11 text-base font-medium"
                    aria-busy={loading}
                    aria-label={loading ? 'Sedang mengirim laporan' : 'Kirim laporan'}
                  >
                    {loading ? 'Mengirim...' : 'Kirim Laporan'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Search Ticket Card */}
            <Card
              ref={cardTrackRef}
              className="border-slate-200/80 bg-white/90 backdrop-blur shadow-lg shadow-slate-200/50 rounded-xl overflow-hidden transition-shadow hover:shadow-xl hover:shadow-slate-200/60 focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:ring-offset-2"
              aria-labelledby="card-track-title"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600" aria-hidden>
                    <Search className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle id="card-track-title" className="text-xl text-slate-800">
                      Lacak Tiket
                    </CardTitle>
                    <CardDescription className="text-slate-500 mt-0.5">
                      Masukkan nomor tiket untuk melihat status
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleSearch} className="space-y-4" aria-labelledby="card-track-title">
                  <div className="space-y-2">
                    <Label htmlFor="searchTicket" className="text-slate-700">
                      Nomor Tiket
                    </Label>
                    <Input
                      id="searchTicket"
                      type="text"
                      value={searchTicket}
                      onChange={(e) => setSearchTicket(e.target.value)}
                      placeholder="Contoh: a123b456"
                      className="border-slate-300 focus-visible:ring-cyan-500 focus-visible:border-cyan-500"
                      aria-label="Nomor tiket untuk dicari"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 focus-visible:ring-cyan-400 h-11 text-base font-medium"
                    disabled={!searchTicket.trim()}
                    aria-label="Cari tiket"
                  >
                    <Search className="w-4 h-4 mr-2" aria-hidden />
                    Cari Tiket
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
