/**
 * Servicio para el portal corporativo CAMSA.
 * Gestiona beneficios, reservaciones, solicitudes y notificaciones.
 */
import api from './api';

// ── Perfil corporativo ──────────────────────────────────────────────────────

export const getCorporateProfile = () =>
  api.get('/auth/me/').then((r) => r.data);

export const updateCorporateProfile = (data) =>
  api.patch('/auth/me/', { profile: data }).then((r) => r.data);

// ── Beneficios ──────────────────────────────────────────────────────────────

export const getBenefitTypes = () =>
  api.get('/corporate/benefits/').then((r) => r.data);

export const getBenefitAvailability = (slug, dateFrom, dateTo) =>
  api.get(`/corporate/benefits/${slug}/availability/`, {
    params: { date_from: dateFrom, date_to: dateTo },
  }).then((r) => r.data);

export const requestBenefit = (slug, notes = '') =>
  api.post(`/corporate/benefits/${slug}/request/`, { benefit_type_slug: slug, notes }).then((r) => r.data);

// ── Solicitudes ─────────────────────────────────────────────────────────────

export const getMyRequests = (params = {}) =>
  api.get('/corporate/requests/', { params }).then((r) => r.data);

// ── Reservaciones ───────────────────────────────────────────────────────────

export const getMyReservations = (params = {}) =>
  api.get('/corporate/reservations/', { params }).then((r) => r.data);

export const getReservationDetail = (id) =>
  api.get(`/corporate/reservations/${id}/`).then((r) => r.data);

export const createReservation = (data) =>
  api.post('/corporate/reservations/create/', data).then((r) => r.data);

export const cancelReservation = (id, reason = '') =>
  api.post(`/corporate/reservations/${id}/cancel/`, { reason }).then((r) => r.data);

// ── Notificaciones ──────────────────────────────────────────────────────────

export const getNotifications = () =>
  api.get('/corporate/notifications/').then((r) => r.data);

export const getUnreadNotificationCount = () =>
  api.get('/corporate/notifications/unread-count/').then((r) => r.data);

export const markNotificationsRead = (ids = [], all = false) =>
  api.post('/corporate/notifications/mark-read/', { ids, all }).then((r) => r.data);

// ── Dashboard ───────────────────────────────────────────────────────────────

export const getCorporateDashboardData = () =>
  api.get('/corporate/dashboard/').then((r) => r.data);

// ── Admin: Beneficios ────────────────────────────────────────────────────────

export const adminGetBenefits = (params = {}) =>
  api.get('/admin/corporate/benefits/', { params }).then((r) => r.data);

export const adminCreateBenefit = (data) =>
  api.post('/admin/corporate/benefits/', data).then((r) => r.data);

export const adminUpdateBenefit = (id, data) =>
  api.patch(`/admin/corporate/benefits/${id}/`, data).then((r) => r.data);

export const adminDeleteBenefit = (id) =>
  api.delete(`/admin/corporate/benefits/${id}/`).then((r) => r.data);

// ── Admin: Horarios ──────────────────────────────────────────────────────────

export const adminGetSchedules = (benefitId) =>
  api.get(`/admin/corporate/benefits/${benefitId}/schedules/`).then((r) => r.data);

export const adminCreateSchedule = (benefitId, data) =>
  api.post(`/admin/corporate/benefits/${benefitId}/schedules/`, data).then((r) => r.data);

export const adminUpdateSchedule = (id, data) =>
  api.patch(`/admin/corporate/schedules/${id}/`, data).then((r) => r.data);

export const adminDeleteSchedule = (id) =>
  api.delete(`/admin/corporate/schedules/${id}/`).then((r) => r.data);

// ── Admin: Excepciones ───────────────────────────────────────────────────────

export const adminGetExceptions = (params = {}) =>
  api.get('/admin/corporate/exceptions/', { params }).then((r) => r.data);

export const adminCreateException = (data) =>
  api.post('/admin/corporate/exceptions/', data).then((r) => r.data);

export const adminDeleteException = (id) =>
  api.delete(`/admin/corporate/exceptions/${id}/`).then((r) => r.data);

// ── Admin: Reservaciones ─────────────────────────────────────────────────────

export const adminGetReservations = (params = {}) =>
  api.get('/admin/corporate/reservations/', { params }).then((r) => r.data);

export const adminUpdateReservation = (id, data) =>
  api.patch(`/admin/corporate/reservations/${id}/`, data).then((r) => r.data);

// ── Admin: Solicitudes ───────────────────────────────────────────────────────

export const adminGetRequests = (params = {}) =>
  api.get('/admin/corporate/requests/', { params }).then((r) => r.data);

export const adminUpdateRequest = (id, data) =>
  api.patch(`/admin/corporate/requests/${id}/`, data).then((r) => r.data);

// ── Admin: Empleados y Stats ─────────────────────────────────────────────────

export const adminGetEmployees = (params = {}) =>
  api.get('/admin/corporate/employees/', { params }).then((r) => r.data);

export const adminGetCorporateStats = () =>
  api.get('/admin/corporate/stats/').then((r) => r.data);

const corporateService = {
  getCorporateProfile,
  updateCorporateProfile,
  getBenefitTypes,
  getBenefitAvailability,
  requestBenefit,
  getMyRequests,
  getMyReservations,
  getReservationDetail,
  createReservation,
  cancelReservation,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
  getCorporateDashboardData,
  adminGetBenefits,
  adminCreateBenefit,
  adminUpdateBenefit,
  adminDeleteBenefit,
  adminGetSchedules,
  adminCreateSchedule,
  adminUpdateSchedule,
  adminDeleteSchedule,
  adminGetExceptions,
  adminCreateException,
  adminDeleteException,
  adminGetReservations,
  adminUpdateReservation,
  adminGetRequests,
  adminUpdateRequest,
  adminGetEmployees,
  adminGetCorporateStats,
};

export default corporateService;
