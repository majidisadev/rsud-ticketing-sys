import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { AlertCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Load saved options from localStorage on mount
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
      } catch (error) {
        console.error('Error loading saved options:', error);
      }
    };

    loadSavedOptions();
    fetchIpsrsStatus();
  }, []);

  const fetchIpsrsStatus = async () => {
    try {
      const res = await api.get('/settings/public/ipsrs-enabled');
      setIpsrsEnabled(res.data.ipsrsEnabled);
      // If IPSRS is disabled and currently selected, switch to SIMRS
      if (!res.data.ipsrsEnabled && formData.category === 'IPSRS') {
        setFormData(prev => ({ ...prev, category: 'SIMRS' }));
      }
    } catch (error) {
      console.error('Fetch IPSRS status error:', error);
    }
  };

  // Save value to localStorage
  const saveToLocalStorage = (key, value) => {
    if (!value || value.trim() === '') return;
    
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      const trimmedValue = value.trim();
      
      // Remove if exists, then add to beginning (most recent first)
      const filtered = saved.filter(item => item !== trimmedValue);
      const updated = [trimmedValue, ...filtered].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(updated));
      
      // Update state
      if (key === 'savedReporterNames') {
        setSavedOptions(prev => ({ ...prev, reporterNames: updated }));
      } else if (key === 'savedReporterUnits') {
        setSavedOptions(prev => ({ ...prev, reporterUnits: updated }));
      } else if (key === 'savedReporterPhones') {
        setSavedOptions(prev => ({ ...prev, reporterPhones: updated }));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
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

      // Save form values to localStorage after successful submission
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center items-center mb-4">
            <img 
              src={`${process.env.PUBLIC_URL}/logo192.png`} 
              alt="RSUD Logo" 
              className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Sistem Ticketing RSUD
          </h1>
          <p className="text-sm sm:text-base text-gray-600">Laporkan masalah dan lacak status tiket Anda</p>
        </div>

        {/* Login Button and All Tickets Button */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user && (user.role === 'admin' || user.role === 'teknisi_simrs' || user.role === 'teknisi_ipsrs') ? (
              <Button
                onClick={() => navigate(user.role === 'admin' ? '/admin/tickets' : '/technician/all-tasks')}
                variant="default"
                className="text-sm sm:text-base"
              >
                Semua Tiket
              </Button>
            ) : null}
            <a
              href="/login"
              className="inline-block"
            >
              <Button variant="default" className="text-sm sm:text-base">
                Login Admin/Teknisi
              </Button>
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Report Form */}
          <Card>
            <CardHeader>
              <CardTitle>Laporkan Masalah</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Nama Pelapor *</Label>
                  <div className="relative">
                    <Input
                      id="reporterName"
                      name="reporterName"
                      list="reporterNameOptions"
                      value={formData.reporterName}
                      onChange={handleInputChange}
                      placeholder="Ketik atau pilih dari daftar"
                      required
                    />
                    <datalist id="reporterNameOptions">
                      {savedOptions.reporterNames.map((name, index) => (
                        <option key={index} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterUnit">Unit/Ruangan *</Label>
                  <div className="relative">
                    <Input
                      id="reporterUnit"
                      name="reporterUnit"
                      list="reporterUnitOptions"
                      value={formData.reporterUnit}
                      onChange={handleInputChange}
                      placeholder="Ketik atau pilih dari daftar"
                      required
                    />
                    <datalist id="reporterUnitOptions">
                      {savedOptions.reporterUnits.map((unit, index) => (
                        <option key={index} value={unit} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterPhone">Nomor Telp/WA *</Label>
                  <div className="relative">
                    <Input
                      id="reporterPhone"
                      name="reporterPhone"
                      type="tel"
                      list="reporterPhoneOptions"
                      value={formData.reporterPhone}
                      onChange={handleInputChange}
                      placeholder="Ketik atau pilih dari daftar"
                      required
                    />
                    <datalist id="reporterPhoneOptions">
                      {savedOptions.reporterPhones.map((phone, index) => (
                        <option key={index} value={phone} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="category-simrs"
                        name="category"
                        value="SIMRS"
                        checked={formData.category === 'SIMRS'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        required
                      />
                      <Label htmlFor="category-simrs" className="font-normal cursor-pointer">
                        SIMRS
                      </Label>
                    </div>
                    {ipsrsEnabled && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="category-ipsrs"
                          name="category"
                          value="IPSRS"
                          checked={formData.category === 'IPSRS'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <Label htmlFor="category-ipsrs" className="font-normal cursor-pointer">
                          IPSRS
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi Masalah *</Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows="4"
                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photo">Upload Foto (Opsional, Max 25MB)</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Mengirim...' : 'Kirim Laporan'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Ticket */}
          <Card>
            <CardHeader>
              <CardTitle>Lacak Tiket</CardTitle>
              <CardDescription>Masukkan nomor tiket untuk melihat status</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="searchTicket">Nomor Tiket</Label>
                  <Input
                    id="searchTicket"
                    type="text"
                    value={searchTicket}
                    onChange={(e) => setSearchTicket(e.target.value)}
                    placeholder="Contoh: TKT-12345678-001"
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Cari Tiket
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
