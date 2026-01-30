import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import api from '../../config/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, monthlyRes, yearlyRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/monthly'),
        api.get('/dashboard/yearly')
      ]);

      setStats(statsRes.data);
      setMonthlyData(monthlyRes.data);
      setYearlyData(yearlyRes.data);
    } catch (error) {
      console.error('Fetch dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pieData = stats?.todayByCategory ? [
    { name: 'SIMRS', value: stats.todayByCategory.SIMRS },
    { name: 'IPSRS', value: stats.todayByCategory.IPSRS }
  ] : [];

  const COLORS = ['#3B82F6', '#10B981'];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard Admin</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Baru</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.statusCounts?.Baru || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Diproses</p>
            <p className="text-2xl font-bold text-yellow-600">{stats?.statusCounts?.Diproses || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Selesai</p>
            <p className="text-2xl font-bold text-green-600">{stats?.statusCounts?.Selesai || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Batal</p>
            <p className="text-2xl font-bold text-red-600">{stats?.statusCounts?.Batal || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie Chart - Today's Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Masalah Hari Ini (SIMRS vs IPSRS)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart - Monthly */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Jumlah Masalah Bulan Ini (per Tanggal)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="SIMRS" stroke="#3B82F6" name="SIMRS" />
                <Line type="monotone" dataKey="IPSRS" stroke="#10B981" name="IPSRS" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - Yearly */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jumlah Masalah 12 Bulan Terakhir (per Bulan)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="SIMRS" fill="#3B82F6" name="SIMRS" />
              <Bar dataKey="IPSRS" fill="#10B981" name="IPSRS" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
