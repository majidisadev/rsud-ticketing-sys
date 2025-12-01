import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { AlertCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
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

        {/* Login Button */}
        <div className="text-center mb-4 sm:mb-6">
          <a
            href="/login"
            className="inline-block"
          >
            <Button variant="default" className="text-sm sm:text-base">
              Login Admin/Teknisi
            </Button>
          </a>
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
                  <Input
                    id="reporterName"
                    name="reporterName"
                    value={formData.reporterName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterUnit">Unit/Ruangan *</Label>
                  <Input
                    id="reporterUnit"
                    name="reporterUnit"
                    value={formData.reporterUnit}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterPhone">Nomor Telp/WA *</Label>
                  <Input
                    id="reporterPhone"
                    name="reporterPhone"
                    type="tel"
                    value={formData.reporterPhone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="SIMRS">SIMRS</option>
                    <option value="IPSRS">IPSRS</option>
                  </Select>
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
