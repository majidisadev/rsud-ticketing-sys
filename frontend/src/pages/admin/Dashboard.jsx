import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import api from '../../config/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAdminPageAnimation } from '../../hooks/useAdminPageAnimation';

const Dashboard = () => {
  const containerRef = useRef(null);
  const pieCardRef = useRef(null);
  const lineCardRef = useRef(null);
  const barCardRef = useRef(null);

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

  useAdminPageAnimation({
    containerRef,
    cardRefs: [pieCardRef, lineCardRef, barCardRef],
    enabled: !loading
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" role="status" aria-live="polite" aria-label="Memuat dashboard">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200 border-t-blue-600" aria-hidden="true" />
        <p className="text-sm text-gray-600">Memuat data dashboard…</p>
      </div>
    );
  }

  const pieData = stats?.todayByCategory ? [
    { name: 'SIMRS', value: stats.todayByCategory.SIMRS },
    { name: 'IPSRS', value: stats.todayByCategory.IPSRS }
  ] : [];

  const COLORS = ['#3B82F6', '#10B981'];

  return (
    <main ref={containerRef} className="space-y-5 sm:space-y-6" aria-label="Dashboard admin">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dashboard Admin</h1>

      {/* Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6" aria-label="Grafik masalah hari ini dan bulan ini">
        <Card ref={pieCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Masalah Hari Ini (SIMRS vs IPSRS)</CardTitle>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label={`Grafik pie: SIMRS dan IPSRS hari ini. ${pieData.map((d) => `${d.name} ${d.value} masalah`).join(', ')}`}>
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
            </div>
          </CardContent>
        </Card>

        <Card ref={lineCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Jumlah Masalah Bulan Ini (per Tanggal)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData} aria-label="Grafik garis jumlah masalah per tanggal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="SIMRS" stroke="#3B82F6" name="SIMRS" strokeWidth={2} />
                <Line type="monotone" dataKey="IPSRS" stroke="#10B981" name="IPSRS" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <Card ref={barCardRef} className="shadow-sm border-gray-200/80 transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Jumlah Masalah 12 Bulan Terakhir (per Bulan)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={yearlyData} aria-label="Grafik batang jumlah masalah per bulan">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="SIMRS" fill="#3B82F6" name="SIMRS" radius={[4, 4, 0, 0]} />
              <Bar dataKey="IPSRS" fill="#10B981" name="IPSRS" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </main>
  );
};

export default Dashboard;
