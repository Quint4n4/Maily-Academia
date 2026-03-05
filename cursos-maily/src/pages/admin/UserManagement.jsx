import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, X, UserCheck, UserX, Edit, Key, Unlock, Lock,
  Phone, Building2, ShieldCheck, GraduationCap, UserPlus, CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, Button, Input, Modal, Badge } from '../../components/ui';
import userService from '../../services/userService';
import adminService from '../../services/adminService';
const ROLE_LABELS = { admin: 'Admin', instructor: 'Profesor', student: 'Estudiante' };
const ROLE_COLORS = { admin: 'accent', instructor: 'primary', student: 'secondary' };
const PHONE_PATTERN = /^[0-9]{10}$/;
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

// Secciones con acceso restringido (no Longevity 360 que es pública)
const PRIVATE_SECTIONS = [
  { slug: 'maily-academia', name: 'Maily Academia', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { slug: 'corporativo-camsa', name: 'Corporativo CAMSA', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
];

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
  if (!PASSWORD_HAS_UPPER.test(password)) return 'Debe contener al menos una mayúscula';
  if (!PASSWORD_HAS_LOWER.test(password)) return 'Debe contener al menos una minúscula';
  if (!PASSWORD_HAS_DIGIT.test(password)) return 'Debe contener al menos un número';
  if (!PASSWORD_HAS_SPECIAL.test(password)) return 'Debe contener al menos un carácter especial';
  return null;
}

const TABS = [
  { id: '', label: 'Todos', icon: Users },
  { id: 'student', label: 'Estudiantes', icon: GraduationCap },
  { id: 'instructor', label: 'Profesores', icon: ShieldCheck },
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [sections, setSections] = useState([]);

  // Modal crear instructor
  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [instrForm, setInstrForm] = useState({ email: '', username: '', firstName: '', lastName: '', password: '', sectionSlug: '' });
  const [instrError, setInstrError] = useState('');
  const [instrPwdError, setInstrPwdError] = useState('');
  const [instrSaving, setInstrSaving] = useState(false);

  // Modal crear estudiante
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ email: '', firstName: '', lastName: '', phone: '', password: '', sectionSlugs: [] });
  const [studentErrors, setStudentErrors] = useState({});
  const [studentSaving, setStudentSaving] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Modal edición
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', role: '', sectionSlug: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Modal contraseña
  const [passwordModal, setPasswordModal] = useState({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Modal gestionar acceso estudiante
  const [accessModal, setAccessModal] = useState({ open: false, user: null });
  const [accessSaving, setAccessSaving] = useState(null);
  const [accessError, setAccessError] = useState('');

  // Desbloqueo
  const [unlocking, setUnlocking] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab) params.role = activeTab;
      if (search) params.search = search;
      const res = await userService.list(params);
      setUsers(res.results || res);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    userService.getSections().then(setSections).catch(() => setSections([]));
  }, []);

  useEffect(() => { load(); }, [activeTab, search]);

  // ── Crear Instructor ──────────────────────────────────────────────────────
  const handleCreateInstructor = async (e) => {
    e.preventDefault();
    setInstrError('');
    setInstrPwdError('');
    const pwdErr = validatePassword(instrForm.password);
    if (pwdErr) { setInstrPwdError(pwdErr); return; }
    setInstrSaving(true);
    try {
      await userService.createInstructor(instrForm);
      setShowInstructorModal(false);
      setInstrForm({ email: '', username: '', firstName: '', lastName: '', password: '', sectionSlug: '' });
      load();
    } catch (err) {
      const d = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      setInstrError(first(d?.email) || first(d?.username) || first(d?.first_name) || first(d?.last_name) || first(d?.password) || first(d?.section_slug) || 'Error al crear profesor');
    }
    setInstrSaving(false);
  };

  // ── Crear Estudiante ──────────────────────────────────────────────────────
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const NAME_PATTERN = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

  const validateStudentField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'El correo electrónico es requerido.';
        if (!EMAIL_PATTERN.test(value.trim())) return 'Ingresa un correo electrónico válido.';
        return '';
      case 'firstName':
        if (!value.trim()) return 'El nombre es requerido.';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
        if (!NAME_PATTERN.test(value.trim())) return 'Solo se permiten letras.';
        return '';
      case 'lastName':
        if (!value.trim()) return 'El apellido es requerido.';
        if (value.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres.';
        if (!NAME_PATTERN.test(value.trim())) return 'Solo se permiten letras.';
        return '';
      case 'phone':
        if (!value) return 'El teléfono es requerido.';
        if (!PHONE_PATTERN.test(value)) return 'Debe tener exactamente 10 dígitos numéricos.';
        return '';
      case 'password':
        return validatePassword(value) || '';
      default:
        return '';
    }
  };

  const handleStudentChange = (name, value) => {
    setStudentForm((prev) => ({ ...prev, [name]: value }));
    if (studentErrors[name]) {
      setStudentErrors((prev) => ({ ...prev, [name]: validateStudentField(name, value) }));
    }
  };

  const handleStudentBlur = (name) => {
    const error = validateStudentField(name, studentForm[name]);
    setStudentErrors((prev) => ({ ...prev, [name]: error }));
  };

  const toggleStudentSection = (slug) => {
    setStudentForm((prev) => ({
      ...prev,
      sectionSlugs: prev.sectionSlugs.includes(slug)
        ? prev.sectionSlugs.filter((s) => s !== slug)
        : [...prev.sectionSlugs, slug],
    }));
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    // Validar todos los campos antes de enviar
    const fields = ['email', 'firstName', 'lastName', 'phone', 'password'];
    const errors = {};
    fields.forEach((f) => { errors[f] = validateStudentField(f, studentForm[f]); });
    setStudentErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setStudentSaving(true);
    try {
      await userService.createStudent(studentForm);
      setShowStudentModal(false);
      setStudentForm({ email: '', firstName: '', lastName: '', phone: '', password: '', sectionSlugs: [] });
      setStudentErrors({});
      load();
    } catch (err) {
      const d = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      // Mapear errores del backend a campos individuales
      const serverErrors = {
        email: first(d?.email) || '',
        firstName: first(d?.first_name) || '',
        lastName: first(d?.last_name) || '',
        phone: first(d?.phone) || '',
        password: first(d?.password) || '',
      };
      const hasServerError = Object.values(serverErrors).some(Boolean);
      if (hasServerError) {
        setStudentErrors(serverErrors);
      } else {
        setStudentErrors({ email: first(d?.detail) || first(d?.section_slugs) || 'Error al crear estudiante' });
      }
    }
    setStudentSaving(false);
  };

  // ── Editar usuario ────────────────────────────────────────────────────────
  const openEditModal = (u) => {
    setEditForm({
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      phone: u.phone || '',
      role: u.role,
      sectionSlug: u.instructor_section?.slug || '',
    });
    setEditError('');
    setEditModal({ open: true, user: u });
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditError('');
    if (editForm.phone && !PHONE_PATTERN.test(editForm.phone)) {
      setEditError('El teléfono debe tener exactamente 10 dígitos numéricos.');
      return;
    }
    setEditSaving(true);
    const isInstructor = editForm.role === 'instructor' || editModal.user?.role === 'instructor';
    try {
      await userService.update(editModal.user.id, {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        phone: editForm.phone || null,
        role: editForm.role,
        ...(isInstructor ? { section_slug: editForm.sectionSlug } : {}),
      });
      setEditModal({ open: false, user: null });
      load();
    } catch (err) {
      const d = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      setEditError(first(d?.first_name) || first(d?.last_name) || first(d?.phone) || first(d?.role) || first(d?.section_slug) || 'Error al actualizar usuario');
    }
    setEditSaving(false);
  };

  // ── Gestionar acceso (estudiantes) ────────────────────────────────────────
  const openAccessModal = (u) => {
    setAccessError('');
    setAccessModal({ open: true, user: u });
  };

  const handleToggleAccess = async (u, sectionSlug, hasAccess) => {
    setAccessError('');
    setAccessSaving(sectionSlug);
    try {
      if (hasAccess) {
        await adminService.removeStudentFromSection(sectionSlug, u.id);
      } else {
        await adminService.addStudentToSection(sectionSlug, u.id);
      }
      // Recargar usuario en el modal y en la lista
      const updated = await userService.getById(u.id);
      setAccessModal((prev) => ({ ...prev, user: updated }));
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al actualizar acceso';
      setAccessError(msg);
    }
    setAccessSaving(null);
  };

  // ── Cambio contraseña ─────────────────────────────────────────────────────
  const openPasswordModal = (u) => {
    setNewPassword('');
    setNewPasswordError('');
    setPasswordModal({ open: true, user: u });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setNewPasswordError('');
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { setNewPasswordError(pwdErr); return; }
    setPasswordSaving(true);
    try {
      await userService.changePassword(passwordModal.user.id, newPassword);
      setPasswordModal({ open: false, user: null });
      setNewPassword('');
    } catch (err) {
      const d = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      setNewPasswordError(first(d?.new_password) || first(d?.detail) || 'Error al cambiar contraseña');
    }
    setPasswordSaving(false);
  };

  // ── Toggle activo ─────────────────────────────────────────────────────────
  const handleToggleActive = async (u) => {
    try {
      if (u.is_active) {
        await userService.deactivate(u.id);
      } else {
        await userService.update(u.id, { isActive: true });
      }
      load();
    } catch { /* empty */ }
  };

  const handleUnlock = async (u) => {
    setUnlocking(u.id);
    try {
      await userService.unlockAccount(u.id);
      load();
    } catch { /* empty */ }
    setUnlocking(null);
  };

  const visiblePrivateSections = PRIVATE_SECTIONS;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{users.length} usuarios registrados</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowStudentModal(true)}
            icon={<UserPlus size={18} />}
            variant="secondary"
          >
            Crear Estudiante
          </Button>
          <Button onClick={() => setShowInstructorModal(true)} icon={<Plus size={18} />}>
            Crear Profesor
          </Button>
        </div>
      </div>

      {/* Tabs + Búsqueda */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o email..."
              icon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-maily text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Usuario</th>
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Teléfono</th>
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Rol / Academia</th>
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Estado</th>
                  <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400 dark:text-gray-500">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">@{u.username}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {u.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {u.phone}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin teléfono</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={ROLE_COLORS[u.role] || 'secondary'} size="sm">
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                        {u.role === 'instructor' && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Building2 size={12} />
                            {u.instructor_section ? u.instructor_section.name : 'Sin academia'}
                          </span>
                        )}
                        {u.role === 'student' && u.student_sections?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {u.student_sections.map((s) => (
                              <span
                                key={s.slug}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              >
                                <Building2 size={10} />
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {u.role === 'student' && (!u.student_sections || u.student_sections.length === 0) && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Solo Longevity 360
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                          {u.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {u.is_locked && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                            <Lock size={14} />
                            Bloqueado ({u.lockout_remaining_minutes} min)
                          </span>
                        )}
                        {!u.is_locked && u.failed_login_attempts > 0 && (
                          <span className="text-xs text-yellow-600">
                            {u.failed_login_attempts} intentos fallidos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {u.role === 'student' && (
                          <button
                            onClick={() => openAccessModal(u)}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Gestionar acceso a academias"
                          >
                            <Building2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar usuario"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openPasswordModal(u)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Cambiar contraseña"
                        >
                          <Key size={16} />
                        </button>
                        {(u.is_locked || u.failed_login_attempts > 0) && (
                          <button
                            onClick={() => handleUnlock(u)}
                            disabled={unlocking === u.id}
                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Desbloquear cuenta"
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`p-2 rounded-lg transition-colors ${
                            u.is_active
                              ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={u.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modal Crear Profesor ─────────────────────────────────────────── */}
      <Modal isOpen={showInstructorModal} onClose={() => setShowInstructorModal(false)} title="Crear nuevo Profesor">
        <form onSubmit={handleCreateInstructor} className="space-y-4">
          {instrError && <p className="text-red-500 text-sm">{instrError}</p>}
          <Input label="Email" type="email" required value={instrForm.email} onChange={(e) => setInstrForm({ ...instrForm, email: e.target.value })} />
          <Input label="Username" required value={instrForm.username} onChange={(e) => setInstrForm({ ...instrForm, username: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={instrForm.firstName} onChange={(e) => setInstrForm({ ...instrForm, firstName: e.target.value })} />
            <Input label="Apellido" required value={instrForm.lastName} onChange={(e) => setInstrForm({ ...instrForm, lastName: e.target.value })} />
          </div>
          <div>
            <Input
              label="Contraseña"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={instrForm.password}
              onChange={(e) => { setInstrForm({ ...instrForm, password: e.target.value }); setInstrPwdError(''); }}
              error={instrPwdError}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Mín. {PASSWORD_MIN_LENGTH} caracteres, mayúscula, minúscula, número y carácter especial.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Academia asignada <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={instrForm.sectionSlug}
              onChange={(e) => setInstrForm({ ...instrForm, sectionSlug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily focus:border-transparent"
            >
              <option value="">— Sin academia —</option>
              {sections.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowInstructorModal(false)}>Cancelar</Button>
            <Button type="submit" loading={instrSaving}>Crear Profesor</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Crear Estudiante ────────────────────────────────────────── */}
      <Modal isOpen={showStudentModal} onClose={() => { setShowStudentModal(false); setStudentErrors({}); }} title="Crear nuevo Estudiante">
        <form onSubmit={handleCreateStudent} className="space-y-4" noValidate>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={studentForm.email}
              onChange={(e) => handleStudentChange('email', e.target.value)}
              onBlur={() => handleStudentBlur('email')}
              placeholder="correo@ejemplo.com"
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 ${
                studentErrors.email
                  ? 'border-red-400 focus:ring-red-300 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-maily focus:border-transparent'
              }`}
            />
            {studentErrors.email && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {studentErrors.email}
              </p>
            )}
          </div>

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentForm.firstName}
                onChange={(e) => handleStudentChange('firstName', e.target.value)}
                onBlur={() => handleStudentBlur('firstName')}
                placeholder="Juan"
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 ${
                  studentErrors.firstName
                    ? 'border-red-400 focus:ring-red-300 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-maily focus:border-transparent'
                }`}
              />
              {studentErrors.firstName && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {studentErrors.firstName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentForm.lastName}
                onChange={(e) => handleStudentChange('lastName', e.target.value)}
                onBlur={() => handleStudentBlur('lastName')}
                placeholder="Pérez"
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 ${
                  studentErrors.lastName
                    ? 'border-red-400 focus:ring-red-300 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-maily focus:border-transparent'
                }`}
              />
              {studentErrors.lastName && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {studentErrors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={studentForm.phone}
                onChange={(e) => handleStudentChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => handleStudentBlur('phone')}
                placeholder="10 dígitos"
                maxLength={10}
                className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 ${
                  studentErrors.phone
                    ? 'border-red-400 focus:ring-red-300 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-maily focus:border-transparent'
                }`}
              />
              {studentForm.phone.length > 0 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${studentForm.phone.length === 10 ? 'text-green-500' : 'text-gray-400'}`}>
                  {studentForm.phone.length}/10
                </span>
              )}
            </div>
            {studentErrors.phone ? (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {studentErrors.phone}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Solo números, exactamente 10 dígitos.</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showStudentPassword ? 'text' : 'password'}
                value={studentForm.password}
                onChange={(e) => handleStudentChange('password', e.target.value)}
                onBlur={() => handleStudentBlur('password')}
                placeholder="Mínimo 10 caracteres"
                className={`w-full pr-10 pl-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 ${
                  studentErrors.password
                    ? 'border-red-400 focus:ring-red-300 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-maily focus:border-transparent'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowStudentPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showStudentPassword ? <X size={16} /> : <Key size={16} />}
              </button>
            </div>
            {/* Indicadores de fortaleza */}
            {studentForm.password.length > 0 && (
              <div className="mt-2 space-y-1">
                {[
                  { ok: studentForm.password.length >= PASSWORD_MIN_LENGTH, label: `Mín. ${PASSWORD_MIN_LENGTH} caracteres` },
                  { ok: PASSWORD_HAS_UPPER.test(studentForm.password), label: 'Una mayúscula' },
                  { ok: PASSWORD_HAS_LOWER.test(studentForm.password), label: 'Una minúscula' },
                  { ok: PASSWORD_HAS_DIGIT.test(studentForm.password), label: 'Un número' },
                  { ok: PASSWORD_HAS_SPECIAL.test(studentForm.password), label: 'Un carácter especial' },
                ].map(({ ok, label }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <CheckCircle2 size={12} className={ok ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'} />
                    {label}
                  </div>
                ))}
              </div>
            )}
            {studentErrors.password && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {studentErrors.password}
              </p>
            )}
          </div>

          {/* Selección de academia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Acceso a academias <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Longevity 360</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Acceso público · incluido automáticamente</p>
                </div>
              </div>
              {visiblePrivateSections.map((s) => {
                const checked = studentForm.sectionSlugs.includes(s.slug);
                return (
                  <label
                    key={s.slug}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-purple-50 border-purple-300 dark:bg-purple-900/20 dark:border-purple-600'
                        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      checked={checked}
                      onChange={() => toggleStudentSection(s.slug)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Requiere credenciales del administrador</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setShowStudentModal(false); setStudentErrors({}); }}>Cancelar</Button>
            <Button type="submit" loading={studentSaving} icon={<UserPlus size={16} />}>Crear Estudiante</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Editar Usuario ──────────────────────────────────────────── */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, user: null })}
        title={`Editar usuario: ${editModal.user?.first_name} ${editModal.user?.last_name}`}
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          {editError && <p className="text-red-500 text-sm">{editError}</p>}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium">Email:</span> {editModal.user?.email}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium">Username:</span> @{editModal.user?.username}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
            <Input label="Apellido" required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
          </div>
          <Input
            label="Teléfono"
            type="tel"
            placeholder="Ej: 9876543210"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Solo números, exactamente 10 dígitos.</p>
          {editModal.user?.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily focus:border-transparent"
              >
                <option value="student">Estudiante</option>
                <option value="instructor">Profesor</option>
              </select>
            </div>
          )}
          {(editForm.role === 'instructor' || editModal.user?.role === 'instructor') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="inline-flex items-center gap-1.5"><Building2 size={15} /> Academia asignada</span>
              </label>
              <select
                value={editForm.sectionSlug}
                onChange={(e) => setEditForm({ ...editForm, sectionSlug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily focus:border-transparent"
              >
                <option value="">— Sin academia —</option>
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditModal({ open: false, user: null })}>Cancelar</Button>
            <Button type="submit" loading={editSaving}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Gestionar Acceso (estudiante) ──────────────────────────── */}
      <Modal
        isOpen={accessModal.open}
        onClose={() => setAccessModal({ open: false, user: null })}
        title="Gestionar acceso a academias"
      >
        {accessModal.user && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {accessModal.user.first_name} {accessModal.user.last_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{accessModal.user.email}</p>
            </div>

            {accessError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {accessError}
              </div>
            )}

            <div className="space-y-2">
              {/* Longevity siempre activa */}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Longevity 360</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Academia pública · acceso automático</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  Siempre activo
                </span>
              </div>

              {visiblePrivateSections.map((s) => {
                const hasAccess = (accessModal.user.student_sections || []).some((ms) => ms.slug === s.slug);
                const saving = accessSaving === s.slug;
                return (
                  <div
                    key={s.slug}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                      hasAccess
                        ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800'
                        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasAccess ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Building2 size={16} className={hasAccess ? 'text-purple-600' : 'text-gray-400'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {hasAccess ? 'El estudiante tiene acceso' : 'Sin acceso'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={hasAccess ? 'danger' : 'primary'}
                      loading={saving}
                      onClick={() => handleToggleAccess(accessModal.user, s.slug, hasAccess)}
                    >
                      {hasAccess ? 'Revocar' : 'Dar acceso'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setAccessModal({ open: false, user: null })}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Cambiar Contraseña ──────────────────────────────────────── */}
      <Modal
        isOpen={passwordModal.open}
        onClose={() => setPasswordModal({ open: false, user: null })}
        title="Cambiar contraseña"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cambiar contraseña para: <span className="font-medium">{passwordModal.user?.email}</span>
            </p>
          </div>
          {newPasswordError && <p className="text-red-500 text-sm">{newPasswordError}</p>}
          <div>
            <Input
              label="Nueva contraseña"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setNewPasswordError(''); }}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Mín. {PASSWORD_MIN_LENGTH} caracteres, mayúscula, minúscula, número y carácter especial.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setPasswordModal({ open: false, user: null })}>Cancelar</Button>
            <Button type="submit" loading={passwordSaving}>Cambiar contraseña</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
