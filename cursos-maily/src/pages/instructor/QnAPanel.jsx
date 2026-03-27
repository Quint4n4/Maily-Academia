import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, CheckCircle, Search, Filter } from 'lucide-react';
import { Card, Button, Badge, Input, Pagination } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import courseService from '../../services/courseService';
import qnaService from '../../services/qnaService';

const QnAPanel = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    courseService.list({ instructor: user.id }).then((res) => {
      setCourses(res.results || res);
    }).catch(() => {});
  }, [user.id]);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (statusFilter) params.status = statusFilter;
      if (courseFilter) params.course = courseFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await qnaService.getInstructorQuestions(params);
      setQuestions(res.results || res);
      setTotalCount(res.count ?? (res.results || res).length);
    } catch (err) {
      console.error('Error loading Q&A:', err);
    }
    setLoading(false);
  };

  useEffect(() => { setPage(1); }, [statusFilter, courseFilter, searchQuery]);
  useEffect(() => { load(page); }, [statusFilter, courseFilter, searchQuery, page]);

  const handleReply = async (questionId) => {
    const body = replyText[questionId]?.trim();
    if (!body) return;
    setReplying(questionId);
    try {
      await qnaService.createAnswer(questionId, body);
      setReplyText((prev) => ({ ...prev, [questionId]: '' }));
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                answers: [
                  ...(q.answers || []),
                  { id: Date.now(), user_name: user.name, user_role: 'instructor', body, is_accepted: false, created_at: new Date().toISOString() },
                ],
              }
            : q
        )
      );
    } catch (err) {
      console.error('Error replying:', err);
    }
    setReplying(null);
  };

  const handleAccept = async (answerId, questionId) => {
    try {
      await qnaService.acceptAnswer(answerId);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, answers: (q.answers || []).map((a) => (a.id === answerId ? { ...a, is_accepted: true } : a)) }
            : q
        )
      );
    } catch (err) {
      console.error('Error accepting answer:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Preguntas y Respuestas</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{totalCount} preguntas de tus estudiantes</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar preguntas..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="pending">Sin responder</option>
            <option value="answered">Respondidas</option>
          </select>
          <select
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
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
      ) : questions.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">No hay preguntas que coincidan con tus filtros.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {questions.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{q.user_name}</span>
                      <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</span>
                      {(q.answers || []).length === 0 && (
                        <Badge size="sm" variant="accent">Sin responder</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{q.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{q.body}</p>
                    <p className="text-xs text-gray-400 mt-2">{q.course_title} &middot; {q.lesson_title}</p>
                  </div>
                </div>

                {(q.answers || []).length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 space-y-3">
                    {q.answers.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">{a.user_name}</span>
                            <Badge size="sm" variant={a.user_role === 'instructor' ? 'primary' : 'secondary'}>
                              {a.user_role === 'instructor' ? 'Profesor' : 'Estudiante'}
                            </Badge>
                            {a.is_accepted && <Badge size="sm" variant="accent">Aceptada</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.body}</p>
                        </div>
                        {!a.is_accepted && (
                          <button onClick={() => handleAccept(a.id, q.id)} className="text-green-600 hover:text-green-700 p-1" title="Marcar como aceptada">
                            <CheckCircle size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="text"
                    placeholder="Escribe tu respuesta..."
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-maily/50 focus:border-maily"
                    value={replyText[q.id] || ''}
                    onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply(q.id)}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleReply(q.id)}
                    loading={replying === q.id}
                    icon={<Send size={14} />}
                    disabled={!replyText[q.id]?.trim()}
                  >
                    Responder
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}

          <Pagination
            page={page}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            count={totalCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default QnAPanel;
