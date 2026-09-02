import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { CAMSA } from '../../theme/camsaTheme';
import corporateService from '../../services/corporateService';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer click fuera del dropdown
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Polling del contador cada 60 segundos
  useEffect(() => {
    const fetchCount = () => {
      corporateService.getUnreadNotificationCount()
        .then((d) => setCount(d.count || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = async () => {
    if (!open) {
      setLoading(true);
      try {
        const data = await corporateService.getNotifications();
        setNotifications(Array.isArray(data) ? data : data.results || []);
      } catch {
        // silenciar error de red
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  const handleMarkAllRead = async () => {
    await corporateService.markNotificationsRead([], true);
    setCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const TYPE_ICONS = {
    reservation_confirmed: '✅',
    reservation_cancelled: '❌',
    reservation_pending: '⏳',
    request_approved: '✅',
    request_rejected: '❌',
    request_delivered: '📦',
    reminder: '🔔',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg transition-opacity hover:opacity-70"
        style={{ color: CAMSA.textMuted }}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: '#fc8181', color: '#fff' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-50"
          style={{ backgroundColor: CAMSA.bgCard, borderColor: CAMSA.border }}
        >
          {/* Encabezado */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: CAMSA.border }}
          >
            <span className="font-semibold text-sm" style={{ color: CAMSA.gold }}>
              Notificaciones
            </span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs flex items-center gap-1 hover:opacity-70"
                  style={{ color: CAMSA.textMuted }}
                >
                  <CheckCheck size={12} /> Marcar leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ color: CAMSA.textDim }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto max-h-72">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: CAMSA.gold, borderTopColor: 'transparent' }}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: CAMSA.textDim }}>
                Sin notificaciones
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex gap-3 px-4 py-3 border-b transition-colors hover:opacity-80"
                  style={{
                    borderColor: CAMSA.border,
                    backgroundColor: n.is_read ? 'transparent' : 'rgba(230,195,100,0.05)',
                  }}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[n.notification_type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: n.is_read ? CAMSA.textMuted : CAMSA.textPrimary }}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: CAMSA.textDim }}>
                      {n.message}
                    </p>
                    <p className="text-xs mt-1" style={{ color: CAMSA.textDim }}>
                      {new Date(n.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: CAMSA.gold }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
