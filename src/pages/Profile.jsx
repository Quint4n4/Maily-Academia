import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  Award,
  Clock,
  Edit3,
  Save,
  Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { Card, Button, Input, Badge } from '../components/ui';
import coursesData from '../data/courses';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { progress, getCertificates, getCourseProgress } = useProgress();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const certificates = getCertificates();

  // Calcular estadísticas
  const stats = {
    coursesStarted: Object.keys(progress.courses || {}).length,
    certificatesEarned: certificates.length,
    lessonsCompleted: Object.values(progress.courses || {}).reduce((acc, course) => {
      return acc + Object.values(course.modules || {}).reduce((mAcc, mod) => {
        return mAcc + (mod.completedLessons?.length || 0);
      }, 0);
    }, 0),
    streak: progress.streak || 0
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header con avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-maily to-maily-dark" />

            <div className="relative pt-16 pb-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=4A90A4&color=fff&size=128`}
                  alt={user?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Nombre y email */}
              {isEditing ? (
                <div className="mt-4 max-w-sm mx-auto space-y-4">
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tu nombre"
                    icon={User}
                  />
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com"
                    icon={Mail}
                    type="email"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      icon={Save}
                      onClick={handleSave}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 mt-4">
                    {user?.name}
                  </h1>
                  <p className="text-gray-500">{user?.email}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Miembro desde {formatDate(user?.createdAt)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    icon={Edit3}
                    onClick={() => setIsEditing(true)}
                  >
                    Editar perfil
                  </Button>
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Estadísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
        >
          {[
            { icon: BookOpen, label: 'Cursos iniciados', value: stats.coursesStarted, color: 'blue' },
            { icon: Award, label: 'Certificados', value: stats.certificatesEarned, color: 'yellow' },
            { icon: Clock, label: 'Lecciones vistas', value: stats.lessonsCompleted, color: 'green' },
            { icon: Calendar, label: 'Días de racha', value: stats.streak, color: 'orange' }
          ].map((stat, index) => (
            <Card key={index}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Cursos en progreso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Mi progreso en cursos
            </h2>
            <div className="space-y-4">
              {coursesData.map(course => {
                const courseProgress = progress.courses?.[course.id];
                if (!courseProgress) return null;

                const lessonsPerModule = {};
                course.modules.forEach(m => {
                  lessonsPerModule[m.id] = m.lessons.length;
                });
                const progressData = getCourseProgress(course.id, course.modules.length, lessonsPerModule);

                return (
                  <div key={course.id} className="flex items-center gap-4">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-16 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{course.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-maily rounded-full transition-all"
                            style={{ width: `${progressData.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">{progressData.percentage}%</span>
                      </div>
                    </div>
                    <Badge
                      variant={progressData.percentage === 100 ? 'success' : 'primary'}
                      size="sm"
                    >
                      {progressData.percentage === 100 ? 'Completado' : 'En progreso'}
                    </Badge>
                  </div>
                );
              })}

              {Object.keys(progress.courses || {}).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Aún no has comenzado ningún curso
                </p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Certificados recientes */}
        {certificates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Certificados obtenidos
              </h2>
              <div className="space-y-3">
                {certificates.slice(-5).reverse().map(cert => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg"
                  >
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cert.moduleTitle}</p>
                      <p className="text-sm text-gray-500">{cert.courseTitle}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(cert.issuedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
