import { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, FileText, Save, Check, Camera, Loader2 } from 'lucide-react';
import { Card, Button, Input, Badge, UserAvatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSection } from '../context/SectionContext';
import { useToast } from '../context/ToastContext';
import ImageCropModal from '../components/ImageCropModal';
import api from '../services/api';

const ROLE_LABELS = { admin: 'Administrador', instructor: 'Profesor', student: 'Estudiante' };

const Profile = () => {
  const { user, updateProfile, updateAvatar } = useAuth();
  const { currentSection } = useSection();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archivoARecortar, setArchivoARecortar] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const inputFotoRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
  });

  // Usuarios corporativos tienen su propia página de perfil.
  //
  // Esta comprobación va DESPUÉS de todos los hooks, no antes. Estaba arriba, y
  // eso rompe la primera regla de los hooks: React los identifica por el orden
  // en que se llaman, así que un `return` en medio hace que en unos renders se
  // llamen siete y en otros ninguno. Funcionaba de milagro porque la condición
  // no cambia mientras la página está montada; el día que cambiara, la pantalla
  // reventaría con un error que no señala a esta línea.
  if (currentSection === 'corporativo-camsa') {
    return <Navigate to="/corporativo/profile" replace />;
  }

  const elegirFoto = (e) => {
    const archivo = e.target.files?.[0];
    // El input se limpia siempre: si no, elegir la misma foto dos veces seguidas
    // no dispara el evento y parece que el boton dejo de funcionar.
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      toast.error('Ese archivo no es una imagen.');
      return;
    }
    setArchivoARecortar(archivo);
  };

  const subirFotoRecortada = async (archivoRecortado) => {
    setArchivoARecortar(null);
    setSubiendoFoto(true);
    const datos = new FormData();
    datos.append('avatar', archivoRecortado, 'foto_perfil.jpg');
    try {
      const { data } = await api.patch('/auth/me/avatar/', datos, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateAvatar(data.avatar);
      toast.success('Foto de perfil actualizada.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  };

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
        <div className="relative w-24 h-24 mx-auto mb-4">
          {/* El respaldo de iniciales y el `onError` viven dentro de
              UserAvatar, que es el mismo que pinta la tabla de usuarios. */}
          <UserAvatar src={user?.avatar} nombre={user?.name} size="lg" />

          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            disabled={subiendoFoto}
            aria-label="Cambiar foto de perfil"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-maily text-white flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800 hover:bg-maily-dark transition-colors disabled:opacity-60"
          >
            {subiendoFoto ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          </button>

          {/* `image/*` a proposito, no una lista cerrada: el recorte convierte a
              JPEG lo que sea que el navegador sepa abrir, HEIC de iPhone
              incluido, asi que el servidor recibe siempre un formato que acepta. */}
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            onChange={elegirFoto}
            className="sr-only"
          />
        </div>
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

      {/* `cubrir` es lo que evita los marcos: sin el, una foto vertical se
          encaja entera en el recuadro y los huecos se rellenan de negro, y esas
          barras quedan grabadas dentro del JPEG. 512px basta de sobra para un
          avatar y deja el archivo muy por debajo del limite de 2 MB. */}
      <ImageCropModal
        isOpen={!!archivoARecortar}
        imageFile={archivoARecortar}
        onComplete={subirFotoRecortada}
        onCancel={() => setArchivoARecortar(null)}
        aspect={1}
        cubrir
        circular
        outputWidth={512}
        titulo="Ajusta tu foto de perfil"
        nombreArchivo="foto_perfil.jpg"
      />
    </div>
  );
};

export default Profile;
