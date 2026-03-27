import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, ChevronRight } from 'lucide-react';
import { Card, Pagination } from '../../components/ui';
import courseService from '../../services/courseService';
import instructorService from '../../services/instructorService';

const StudentManagement = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    courseService.list({}).then((res) => setCourses(res.results || res || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [search, courseFilter]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page };
        if (search) params.search = search;
        if (courseFilter) params.course = courseFilter;
        const studentsRes = await instructorService.getStudents(params);
        const list = studentsRes.results || studentsRes;
        setStudents(Array.isArray(list) ? list : []);
        setTotalCount(studentsRes.count ?? (Array.isArray(list) ? list.length : 0));
      } catch { setStudents([]); }
      setLoading(false);
    };
    load();
  }, [search, courseFilter, page]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={28} className="text-maily" />
          Mis Alumnos
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Lista de estudiantes inscritos en tus cursos</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          {students.length === 0 ? (
            <p className="p-8 text-center text-gray-500 dark:text-gray-400">No hay alumnos que coincidan con los filtros.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/instructor/students/${s.id}`)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-maily/20 flex items-center justify-center text-maily font-semibold">
                      {(s.name || s.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{s.name || s.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{s.email}</p>
                      {s.country && <p className="text-xs text-gray-400">{s.country}</p>}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {s.courses_enrolled} curso{s.courses_enrolled !== 1 ? 's' : ''}
                    </div>
                    {s.last_activity && (
                      <span className="text-xs text-gray-400">
                        Última actividad: {new Date(s.last_activity).toLocaleDateString()}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        count={totalCount}
        onPageChange={setPage}
      />
    </div>
  );
};

export default StudentManagement;
