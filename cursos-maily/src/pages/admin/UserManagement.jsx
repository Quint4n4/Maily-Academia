import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, X, UserCheck, UserX, Edit, Key, Unlock, Lock, Phone } from 'lucide-react';
import { Card, Button, Input, Modal, Badge } from '../../components/ui';
import userService from '../../services/userService';

const ROLE_LABELS = { admin: 'Admin', instructor: 'Profesor', student: 'Estudiante' };
const ROLE_COLORS = { admin: 'accent', instructor: 'primary', student: 'secondary' };
const PHONE_PATTERN = /^[0-9]{10}$/;

// Password rules (align with backend)
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
  if (!PASSWORD_HAS_UPPER.test(password)) return 'Debe contener al menos una mayúscula';
  if (!PASSWORD_HAS_LOWER.test(password)) return 'Debe contener al menos una minúscula';
  if (!PASSWORD_HAS_DIGIT.test(password)) return 'Debe contener al menos un número';
  if (!PASSWORD_HAS_SPECIAL.test(password)) return 'Debe contener al menos un carácter especial';
  return null;
}

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', firstName: '', lastName: '', password: '' });
  const [formError, setFormError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saving, setSaving] = useState(false);

  // Estados para modal de edición
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', role: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Estados para modal de cambio de contraseña
  const [passwordModal, setPasswordModal] = useState({ open: false, user: null });
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Estado para desbloqueo
  const [unlocking, setUnlocking] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const res = await userService.list(params);
      setUsers(res.results || res);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [roleFilter, search]);

  const handleCreateInstructor = async (e) => {
    e.preventDefault();
    setFormError('');
    setPasswordError('');
    const pwdErr = validatePassword(form.password);
    if (pwdErr) {
      setPasswordError(pwdErr);
      return;
    }
    setSaving(true);
    try {
      await userService.createInstructor(form);
      setShowModal(false);
      setForm({ email: '', username: '', firstName: '', lastName: '', password: '' });
      load();
    } catch (err) {
      const data = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      setFormError(
        first(data?.email) || first(data?.username) || first(data?.first_name) || first(data?.last_name) || first(data?.password) || 'Error al crear profesor'
      );
    }
    setSaving(false);
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        await userService.deactivate(user.id);
      } else {
        await userService.update(user.id, { isActive: true });
      }
      load();
    } catch { /* empty */ }
  };

  // Abrir modal de edición
  const openEditModal = (user) => {
    setEditForm({
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      role: user.role,
    });
    setEditError('');
    setEditModal({ open: true, user });
  };

  // Guardar edición de usuario
  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditError('');
    
    if (editForm.phone && !PHONE_PATTERN.test(editForm.phone)) {
      setEditError('El teléfono debe tener exactamente 10 dígitos numéricos.');
      return;
    }

    setEditSaving(true);
    try {
      await userService.update(editModal.user.id, {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        phone: editForm.phone || null,
        role: editForm.role,
      });
      setEditModal({ open: false, user: null });
      load();
    } catch (err) {
      const data = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      setEditError(
        first(data?.first_name) || first(data?.last_name) || first(data?.phone) || first(data?.role) || 'Error al actualizar usuario'
      );
    }
    setEditSaving(false);
  };

  // Abrir modal de cambio de contraseña
  const openPasswordModal = (user) => {
    setNewPassword('');
    setNewPasswordError('');
    setPasswordModal({ open: true, user });
  };

  // Cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setNewPasswordError('');
    
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setNewPasswordError(pwdErr);
      return;
    }

    setPasswordSaving(true);
    try {
      await userService.changePassword(passwordModal.user.id, newPassword);
      setPasswordModal({ open: false, user: null });
      setNewPassword('');
    } catch (err) {
      const data = err.response?.data;
      const first = (v) => (Array.isArray(v) ? v[0] : v);
      setNewPasswordError(first(data?.new_password) || first(data?.detail) || 'Error al cambiar contraseña');
    }
    setPasswordSaving(false);
  };

  // Desbloquear cuenta
  const handleUnlock = async (user) => {
    setUnlocking(user.id);
    try {
      await userService.unlockAccount(user.id);
      load();
    } catch { /* empty */ }
    setUnlocking(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{users.length} usuarios registrados</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={18} />}>
          Crear Profesor
        </Button>
      </div>

      {/* Filters */}
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
            {['', 'admin', 'instructor', 'student'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-maily text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {r ? ROLE_LABELS[r] : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users table */}
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
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Rol</th>
                  <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Estado</th>
                  <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
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
                      <Badge variant={ROLE_COLORS[u.role] || 'secondary'} size="sm">
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
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

      {/* Create Instructor Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Crear nuevo Profesor">
        <form onSubmit={handleCreateInstructor} className="space-y-4">
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Apellido" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <Input
              label="Contraseña"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setPasswordError(''); }}
              error={passwordError}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Mín. {PASSWORD_MIN_LENGTH} caracteres, una mayúscula, una minúscula, un número y un carácter especial.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear Profesor</Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal 
        isOpen={editModal.open} 
        onClose={() => setEditModal({ open: false, user: null })} 
        title={`Editar usuario: ${editModal.user?.first_name} ${editModal.user?.last_name}`}
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          {editError && <p className="text-red-500 text-sm">{editError}</p>}
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Email:</span> {editModal.user?.email}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Username:</span> @{editModal.user?.username}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Nombre" 
              required 
              value={editForm.firstName} 
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} 
            />
            <Input 
              label="Apellido" 
              required 
              value={editForm.lastName} 
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} 
            />
          </div>

          <Input 
            label="Teléfono" 
            type="tel"
            placeholder="Ej: 987654321"
            value={editForm.phone} 
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })} 
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Solo números, exactamente 10 dígitos.
          </p>

          {editModal.user?.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rol
              </label>
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

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setEditModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button type="submit" loading={editSaving}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal 
        isOpen={passwordModal.open} 
        onClose={() => setPasswordModal({ open: false, user: null })} 
        title="Cambiar contraseña"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
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
              Mín. {PASSWORD_MIN_LENGTH} caracteres, una mayúscula, una minúscula, un número y un carácter especial.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setPasswordModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button type="submit" loading={passwordSaving}>
              Cambiar contraseña
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
