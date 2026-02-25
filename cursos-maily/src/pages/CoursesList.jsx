import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Clock, DollarSign } from 'lucide-react';
import { Card, Badge, Input } from '../components/ui';
import courseService from '../services/courseService';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };

const CoursesList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await courseService.list();
        setCourses(res.results || res);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const filteredCourses = useMemo(() => {
    let result = [...courses];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (selectedLevel) result = result.filter((c) => c.level === selectedLevel);
    return result;
  }, [courses, searchQuery, selectedLevel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cursos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{filteredCourses.length} cursos disponibles</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Buscar cursos..." icon={<Search size={18} />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['', 'beginner', 'intermediate', 'advanced'].map((l) => (
              <button key={l} onClick={() => setSelectedLevel(l)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedLevel === l ? 'bg-maily text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                {l ? LEVEL_LABELS[l] : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course, i) => (
          <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/course/${course.id}`}>
              <Card hover padding={false} className="overflow-hidden h-full">
                <div className="relative aspect-video">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3">
                    <Badge variant={course.level === 'beginner' ? 'success' : course.level === 'intermediate' ? 'warning' : 'danger'} size="sm">
                      {LEVEL_LABELS[course.level] || course.level}
                    </Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{course.instructor_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration}</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{course.total_lessons}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${(!course.price || Number(course.price) === 0) ? 'text-green-600 dark:text-green-400' : 'text-maily'}`}>
                        {(!course.price || Number(course.price) === 0) ? 'Gratis' : `$${Number(course.price).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CoursesList;
