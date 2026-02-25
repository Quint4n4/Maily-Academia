import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

import { Card, Button, Badge, Input } from '../../components/ui';
import evaluationService from '../../services/evaluationService';

const STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  expired: 'Expirada',
  completed: 'Completada',
  failed: 'Reprobada',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const InstructorEvaluationsPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [approvingId, setApprovingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await evaluationService.listRequests(
        statusFilter ? { status: statusFilter } : {},
      );
      const items = data.results || data;
      setRequests(items);
    } catch (err) {
      setError('No se pudieron cargar las solicitudes de evaluación.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await evaluationService.approveRequest(id, durationMinutes);
      await loadRequests();
    } catch (err) {
      setError('No se pudo aprobar la solicitud. Verifica la duración e inténtalo de nuevo.');
    }
    setApprovingId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Solicitudes de evaluación final
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Revisa y activa las evaluaciones finales solicitadas por tus alumnos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="completed">Completadas</option>
            <option value="failed">Reprobadas</option>
            <option value="expired">Expiradas</option>
            <option value="">Todas</option>
          </select>
          <Button variant="secondary" size="sm" onClick={loadRequests}>
            Actualizar
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Clock size={16} />
          <span>Duración por defecto de la evaluación (minutos):</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={5}
            max={7 * 24 * 60}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
            className="w-24 text-center"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Se aplicará al aprobar cada solicitud
          </span>
        </div>
      </Card>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-600 dark:text-gray-300">
            No hay solicitudes de evaluación con el filtro seleccionado.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {req.course_title}
                    </h3>
                    <Badge
                      className={STATUS_COLORS[req.status] || STATUS_COLORS.pending}
                      size="sm"
                    >
                      {STATUS_LABELS[req.status] || req.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Alumno:{' '}
                    <span className="font-medium">
                      {req.student_name || req.student_email}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Solicitada: {formatDateTime(req.requested_at)}{' '}
                    {req.approved_at && `· Aprobada: ${formatDateTime(req.approved_at)}`}
                  </p>
                  {req.available_from && req.available_until && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Ventana:{' '}
                      {formatDateTime(req.available_from)} –{' '}
                      {formatDateTime(req.available_until)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'pending' || req.status === 'expired' || req.status === 'failed' ? (
                    <Button
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      onClick={() => handleApprove(req.id)}
                      loading={approvingId === req.id}
                    >
                      Aprobar y activar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      icon={
                        req.status === 'completed'
                          ? <CheckCircle size={14} />
                          : <XCircle size={14} />
                      }
                    >
                      {STATUS_LABELS[req.status]}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorEvaluationsPanel;

