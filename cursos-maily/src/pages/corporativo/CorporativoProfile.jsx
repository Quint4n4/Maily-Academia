import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CAMSA } from '../../theme/camsaTheme';
import corporateService from '../../services/corporateService';
import ImageCropModal from '../../components/ImageCropModal';
import { User, Camera, Phone, Building, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function CorporativoProfile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cropImageFile, setCropImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState({
    bio: '',
    phone: '',
    avatar: null,
    country: '',
    department: '',
    position: '',
    employee_id: '',
    hire_date: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    corporateService.getCorporateProfile()
      .then((data) => {
        const p = data.profile || {};
        setProfileData({
          bio: p.bio || '',
          phone: p.phone || '',
          avatar: p.avatar || null,
          country: p.country || '',
          department: p.department || '',
          position: p.position || '',
          employee_id: p.employee_id || '',
          hire_date: p.hire_date || '',
          emergency_contact_name: p.emergency_contact_name || '',
          emergency_contact_phone: p.emergency_contact_phone || '',
        });
      })
      .catch(() => showToast('Error al cargar el perfil', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const isComplete = profileData.avatar && profileData.department && profileData.position;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await corporateService.updateCorporateProfile({
        department: profileData.department,
        position: profileData.position,
        employee_id: profileData.employee_id,
        hire_date: profileData.hire_date || null,
        emergency_contact_name: profileData.emergency_contact_name,
        emergency_contact_phone: profileData.emergency_contact_phone,
        bio: profileData.bio,
        phone: profileData.phone,
        country: profileData.country,
      });
      showToast('Perfil actualizado correctamente', 'success');
    } catch {
      showToast('Error al guardar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) setCropImageFile(file);
    // limpiar para que el mismo archivo pueda seleccionarse de nuevo
    e.target.value = '';
  };

  const handlePhotoCropped = async (croppedBlob) => {
    setCropImageFile(null);
    const formData = new FormData();
    formData.append('profile.avatar', croppedBlob, 'foto_perfil.jpg');
    try {
      const response = await api.patch('/auth/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfileData((prev) => ({ ...prev, avatar: response.data.profile?.avatar || prev.avatar }));
      showToast('Foto actualizada', 'success');
    } catch {
      showToast('Error al subir la foto', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CAMSA.bg }}>
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: CAMSA.gold, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: CAMSA.bg, color: CAMSA.textPrimary }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: CAMSA.gold }}>
          Mi Perfil Corporativo
        </h1>
        <p className="mb-6" style={{ color: CAMSA.textMuted }}>
          Mantén tu información actualizada para acceder a los beneficios corporativos.
        </p>

        {/* Alerta si perfil incompleto */}
        {!isComplete && (
          <div
            className="flex items-start gap-3 p-4 rounded-lg mb-6 border"
            style={{ backgroundColor: CAMSA.goldGlow, borderColor: CAMSA.goldBorder }}
          >
            <AlertCircle size={20} style={{ color: CAMSA.gold, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-medium" style={{ color: CAMSA.gold }}>Perfil incompleto</p>
              <p className="text-sm" style={{ color: CAMSA.textMuted }}>
                Necesitas foto, departamento y puesto para poder agendar citas o solicitar beneficios.
              </p>
            </div>
          </div>
        )}

        {isComplete && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg mb-6 border"
            style={{ backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}
          >
            <CheckCircle size={18} className="text-green-400" />
            <span className="text-sm text-green-400">
              Perfil completo — puedes acceder a todos los beneficios
            </span>
          </div>
        )}

        {/* Foto de perfil */}
        <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: CAMSA.bgCard }}>
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: CAMSA.gold }}>
            <Camera size={18} /> Foto de Perfil
          </h2>
          <div className="flex items-center gap-6">
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-2"
              style={{ borderColor: CAMSA.goldBorder, backgroundColor: CAMSA.bgSurface }}
            >
              {profileData.avatar ? (
                <img src={profileData.avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <User size={36} style={{ color: CAMSA.textDim }} />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: CAMSA.gold, color: '#000' }}
              >
                {profileData.avatar ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <p className="text-xs mt-1" style={{ color: CAMSA.textDim }}>
                JPG o PNG. Máximo 2 MB.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Información corporativa */}
          <div className="rounded-xl p-6" style={{ backgroundColor: CAMSA.bgCard }}>
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: CAMSA.gold }}>
              <Building size={18} /> Información Corporativa
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: CAMSA.textMuted }}>
                  Departamento <span style={{ color: CAMSA.gold }}>*</span>
                </label>
                <input
                  name="department"
                  value={profileData.department}
                  onChange={handleChange}
                  placeholder="Ej: Clínica, Administración"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                  style={{
                    backgroundColor: CAMSA.bgSurface,
                    borderColor: CAMSA.border,
                    color: CAMSA.textPrimary,
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: CAMSA.textMuted }}>
                  Puesto <span style={{ color: CAMSA.gold }}>*</span>
                </label>
                <input
                  name="position"
                  value={profileData.position}
                  onChange={handleChange}
                  placeholder="Ej: Enfermera, Recepcionista"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                  style={{
                    backgroundColor: CAMSA.bgSurface,
                    borderColor: CAMSA.border,
                    color: CAMSA.textPrimary,
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: CAMSA.textMuted }}>
                  Número de empleado
                </label>
                <input
                  name="employee_id"
                  value={profileData.employee_id}
                  onChange={handleChange}
                  placeholder="Ej: EMP-0023"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                  style={{
                    backgroundColor: CAMSA.bgSurface,
                    borderColor: CAMSA.border,
                    color: CAMSA.textPrimary,
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: CAMSA.textMuted }}>
                  Fecha de ingreso
                </label>
                <input
                  type="date"
                  name="hire_date"
                  value={profileData.hire_date}
                  onChange={handleChange}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                  style={{
                    backgroundColor: CAMSA.bgSurface,
                    borderColor: CAMSA.border,
                    color: CAMSA.textPrimary,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contacto de emergencia */}
          <div className="rounded-xl p-6" style={{ backgroundColor: CAMSA.bgCard }}>
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: CAMSA.gold }}>
              <Phone size={18} /> Contacto de Emergencia
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: CAMSA.textMuted }}>
                  Nombre
                </label>
                <input
                  name="emergency_contact_name"
                  value={profileData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                  style={{
                    backgroundColor: CAMSA.bgSurface,
                    borderColor: CAMSA.border,
                    color: CAMSA.textPrimary,
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: CAMSA.textMuted }}>
                  Teléfono
                </label>
                <input
                  name="emergency_contact_phone"
                  value={profileData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="10 dígitos"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border transition-colors"
                  style={{
                    backgroundColor: CAMSA.bgSurface,
                    borderColor: CAMSA.border,
                    color: CAMSA.textPrimary,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: CAMSA.gold, color: '#000' }}
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>

      <ImageCropModal
        isOpen={!!cropImageFile}
        imageFile={cropImageFile}
        onComplete={handlePhotoCropped}
        onCancel={() => setCropImageFile(null)}
        aspect={1}
      />
    </div>
  );
}
