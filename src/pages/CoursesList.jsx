import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  BookOpen,
  Star,
  Users,
  ChevronDown
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { Card, Badge, ProgressBar } from '../components/ui';
import coursesData from '../data/courses';

const CoursesList = () => {
  const { getCourseProgress } = useProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  const levels = ['all', 'Principiante', 'Intermedio', 'Avanzado'];

  const filteredCourses = useMemo(() => {
    let filtered = [...coursesData];

    // Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por nivel
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }

    // Ordenar
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.students - a.students);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => b.id - a.id);
        break;
      default:
        break;
    }

    return filtered;
  }, [searchQuery, selectedLevel, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Catálogo de Cursos
          </h1>
          <p className="text-gray-500">
            Explora todos nuestros cursos disponibles
          </p>
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cursos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-maily focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Filtro por nivel */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="pl-10 pr-10 py-2.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-maily focus:bg-white outline-none appearance-none cursor-pointer"
              >
                <option value="all">Todos los niveles</option>
                {levels.slice(1).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Ordenar */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-maily focus:bg-white outline-none appearance-none cursor-pointer pr-10"
              >
                <option value="popular">Más populares</option>
                <option value="rating">Mejor valorados</option>
                <option value="newest">Más recientes</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Resultados */}
        <div className="mb-4">
          <p className="text-gray-500">
            {filteredCourses.length} curso{filteredCourses.length !== 1 ? 's' : ''} encontrado{filteredCourses.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Lista de cursos */}
        {filteredCourses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => {
              const lessonsPerModule = {};
              course.modules.forEach(m => {
                lessonsPerModule[m.id] = m.lessons.length;
              });
              const progress = getCourseProgress(course.id, course.modules.length, lessonsPerModule);

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/course/${course.id}`}>
                    <Card hover padding={false} className="overflow-hidden h-full">
                      <div className="relative">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-44 object-cover"
                        />
                        {progress.percentage > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                            <div
                              className="h-full bg-maily transition-all"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge
                            variant={
                              course.level === 'Principiante'
                                ? 'success'
                                : course.level === 'Intermedio'
                                  ? 'warning'
                                  : 'danger'
                            }
                            size="sm"
                          >
                            {course.level}
                          </Badge>
                        </div>
                        {progress.percentage > 0 && (
                          <div className="absolute top-3 right-3">
                            <Badge variant="primary" size="sm">
                              {progress.percentage}% completado
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                          {course.description}
                        </p>

                        {/* Instructor */}
                        <div className="flex items-center gap-2 mb-4">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(course.instructor)}&background=4A90A4&color=fff&size=32`}
                            alt={course.instructor}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-sm text-gray-600">{course.instructor}</span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {course.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {course.totalLessons}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-sm font-medium">{course.rating}</span>
                            </div>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Users className="w-4 h-4" />
                              <span className="text-sm">{course.students.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron cursos
            </h3>
            <p className="text-gray-500">
              Intenta ajustar los filtros o la búsqueda
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CoursesList;
