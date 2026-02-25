import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, Clock, Award } from 'lucide-react';
import { Card, ProgressBar, Badge } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import courseService from '../services/courseService';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };

const MyCourses = () => {
  const { loadDashboard } = useProgress();
  const [dashData, setDashData] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, coursesRes] = await Promise.all([
          loadDashboard(),
          courseService.list(),
        ]);
        setDashData(dash);
        setAllCourses(coursesRes.results || coursesRes);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const enrolledCourses = (dashData?.courses || []).sort(
    (a, b) => (b.progress_percent === 0 ? 1 : 0) - (a.progress_percent === 0 ? 1 : 0)
  );

  const coursesByLevel = { beginner: [], intermediate: [], advanced: [] };
  enrolledCourses.forEach((cp) => {
    const level = allCourses.find((c) => c.id === cp.course_id)?.level || 'beginner';
    if (coursesByLevel[level]) coursesByLevel[level].push(cp);
  });

  const sections = [
    { key: 'beginner', title: 'Principiante', courses: coursesByLevel.beginner },
    { key: 'intermediate', title: 'Intermedio', courses: coursesByLevel.intermediate },
    { key: 'advanced', title: 'Avanzado', courses: coursesByLevel.advanced },
  ];

  const filteredSections = selectedLevel
    ? sections.filter((s) => s.key === selectedLevel)
    : sections;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Mis Cursos</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {enrolledCourses.length} curso{enrolledCourses.length !== 1 ? 's' : ''} inscrito{enrolledCourses.length !== 1 ? 's' : ''}
      </p>

      {enrolledCourses.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aún no tienes cursos</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Explora los cursos e inscríbete en tu primer curso.</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-maily text-white rounded-xl font-medium hover:bg-maily-dark transition-colors"
          >
            Ver cursos <Play size={18} />
          </Link>
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {['', 'beginner', 'intermediate', 'advanced'].map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedLevel(l)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedLevel === l ? 'bg-maily text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {l ? LEVEL_LABELS[l] : 'Todos'}
                </button>
              ))}
            </div>
          </Card>
          <div className="space-y-10">
          {filteredSections.map(({ key, title, courses }) =>
            courses.length === 0 ? null : (
              <section key={key}>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((cp, i) => {
                    const course = allCourses.find((c) => c.id === cp.course_id);
                    const resumeUrl = cp.resume_at
                      ? `/course/${cp.course_id}/lesson/${cp.resume_at.module_id}/${cp.resume_at.lesson_id}`
                      : `/course/${cp.course_id}`;
                    return (
                      <motion.div
                        key={cp.course_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card hover padding={false} className="overflow-hidden h-full flex flex-col">
                          {course?.thumbnail && (
                            <img src={course.thumbnail} alt="" className="w-full aspect-video object-cover" />
                          )}
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Badge variant={course?.level === 'beginner' ? 'success' : course?.level === 'intermediate' ? 'warning' : 'danger'} size="sm">
                                {LEVEL_LABELS[course?.level] || course?.level}
                              </Badge>
                              {cp.progress_percent === 100 && (
                                <Badge variant="success" size="sm">
                                  <Award size={12} /> Completado
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">{cp.course_title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                              {cp.completed_lessons} de {cp.total_lessons} lecciones
                            </p>
                            <ProgressBar value={cp.progress_percent} showLabel={false} size="sm" className="mb-4" />
                            <Link
                              to={resumeUrl}
                              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-maily text-white rounded-xl font-medium hover:bg-maily-dark transition-colors"
                            >
                              <Play size={18} />
                              {cp.progress_percent > 0 ? 'Reanudar' : 'Comenzar'}
                            </Link>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )
          )}
          </div>
        </>
      )}
    </div>
  );
};

export default MyCourses;
