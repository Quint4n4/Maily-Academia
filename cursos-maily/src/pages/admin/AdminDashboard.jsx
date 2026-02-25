import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Award, TrendingUp, ArrowRight, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../../components/ui';
import userService from '../../services/userService';
import courseService from '../../services/courseService';
import adminService from '../../services/adminService';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, instructors: 0, students: 0, courses: 0 });
  const [courses, setCourses] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, coursesRes, purchasesRes] = await Promise.all([
          userService.list(),
          courseService.list(),
          adminService.getPurchases().catch(() => ({ results: [] })),
        ]);
        const userList = usersRes.results || usersRes;
        const courseList = coursesRes.results || coursesRes;
        const purchaseList = Array.isArray(purchasesRes) ? purchasesRes : (purchasesRes.results || []);
        setStats({
          users: userList.length,
          instructors: userList.filter((u) => u.role === 'instructor').length,
          students: userList.filter((u) => u.role === 'student').length,
          courses: courseList.length,
        });
        setCourses(courseList.slice(0, 5));
        setPurchases(purchaseList);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, []);

  const chartData = useMemo(() => {
    const byCourse = {};
    purchases.forEach((p) => {
      const key = p.course_id;
      if (!byCourse[key]) byCourse[key] = { name: p.course_title, compras: 0 };
      byCourse[key].compras += 1;
    });
    return Object.values(byCourse).sort((a, b) => b.compras - a.compras).slice(0, 10);
  }, [purchases]);

  const statCards = [
    { label: 'Total Usuarios', value: stats.users, icon: Users, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Profesores', value: stats.instructors, icon: Users, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Estudiantes', value: stats.students, icon: Users, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Cursos', value: stats.courses, icon: BookOpen, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  ];

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona la plataforma Maily Academia</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Purchases chart and table */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <DollarSign size={22} className="text-green-600" />
          Cursos pagados y compradores
        </h2>
        {chartData.length > 0 ? (
          <>
            <div className="h-64 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickFormatter={(v) => (v?.length > 20 ? v.slice(0, 18) + '...' : v)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value) => [`${value} compras`, '']}
                  />
                  <Bar dataKey="compras" fill="#2563eb" radius={[4, 4, 0, 0]} name="Compras" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Curso</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Usuario</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Monto</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.slice(0, 20).map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-2 text-gray-900 dark:text-white">{p.course_title}</td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{p.user_email}</td>
                      <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">${Number(p.amount).toFixed(2)}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Aún no hay compras registradas.</p>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Usuarios</h2>
            <Link to="/admin/users" className="text-maily hover:underline text-sm flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Administra profesores y estudiantes. Crea nuevas cuentas de profesor, desactiva usuarios y gestiona roles.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Cursos</h2>
            <Link to="/admin/courses" className="text-maily hover:underline text-sm flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Revisa y administra todos los cursos de la plataforma. Publica, archiva o elimina cursos.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
