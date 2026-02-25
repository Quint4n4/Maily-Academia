import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, FileText, Save, Check } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Administrador', instructor: 'Profesor', student: 'Estudiante' };

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      firstName: form.firstName,
      lastName: form.lastName,
      profile: { bio: form.bio, phone: form.phone },
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Mi Perfil</h1>

      {/* Avatar & basic info */}
      <Card className="text-center mb-6">
        <img
          src={user?.avatar}
          alt={user?.name}
          className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
        />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">@{user?.username}</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{user?.email}</p>
        <div className="mt-2">
          <Badge variant="primary" size="sm">{ROLE_LABELS[user?.role] || user?.role}</Badge>
        </div>
        {user?.dateJoined && (
          <p className="text-xs text-gray-400 mt-2">
            Miembro desde {new Date(user.dateJoined).toLocaleDateString('es-MX', { year: 'numeric', month: 'long' })}
          </p>
        )}
      </Card>

      {/* Edit form */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Información personal</h3>
          {!editing && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Editar</Button>
          )}
        </div>

        {saved && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
            <Check size={16} /> Perfil actualizado exitosamente
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              icon={<User size={16} />}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              disabled={!editing}
            />
            <Input
              label="Apellido"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              disabled={!editing}
            />
          </div>
          <Input
            label="Teléfono"
            icon={<Phone size={16} />}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            disabled={!editing}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily disabled:opacity-50 transition-all"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>

        {editing && (
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>Guardar cambios</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Profile;
