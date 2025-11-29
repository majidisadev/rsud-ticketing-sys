import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X } from 'lucide-react';

const ActionModal = ({ ticket, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [ticketData, setTicketData] = useState(null);
  const [actions, setActions] = useState([]);
  const [formData, setFormData] = useState({
    actionType: 'in-progress',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticket) {
      fetchTicketData();
    }
  }, [ticket]);

  const fetchTicketData = async () => {
    try {
      const res = await api.get(`/tickets/${ticket.id}`);
      setTicketData(res.data);
      setActions(res.data.actions || []);
    } catch (error) {
      console.error('Fetch ticket data error:', error);
    }
  };

  // Check if user can edit (add actions)
  const canEdit = ticketData && user && (
    ticketData.assignedTo === user.id ||
    ticketData.coAssignments?.some(ca => ca.technicianId === user.id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/tickets/${ticket.id}/actions`, formData);
      setFormData({ actionType: 'in-progress', description: '' });
      fetchTicketData();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert(error.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tindakan - {ticket.ticketNumber}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Actions List */}
          <div className="mb-6 space-y-4 max-h-64 overflow-y-auto">
            {actions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Belum ada tindakan</p>
            ) : (
              actions.map((action) => (
                <div key={action.id} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{action.actionType.replace('-', ' ')}</p>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        oleh {action.creator?.fullName || 'System'} - {new Date(action.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Action Form - Only show if user can edit */}
          {canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="actionType">Kategori Tindakan *</Label>
                <Select
                  id="actionType"
                  value={formData.actionType}
                  onChange={(e) => setFormData(prev => ({ ...prev, actionType: e.target.value }))}
                  required
                >
                  <option value="in-progress">In Progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="confirmed">Confirmed</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Menyimpan...' : 'Tambah Tindakan'}
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Tutup
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">Anda tidak memiliki akses untuk menambah tindakan pada tiket ini.</p>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Tutup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActionModal;
