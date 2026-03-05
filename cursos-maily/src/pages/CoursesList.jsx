import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge, Input } from '../components/ui';
import courseService from '../services/courseService';
import categoryService from '../services/categoryService';
import { useSection } from '../context/SectionContext';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };

const INITIAL_CATEGORIES_SHOWN = 8;
const INITIAL_SUBCATEGORIES_SHOWN = 8;

const SidebarSection = ({ title, expanded, onToggle, children, onShowMore }) => {
  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-left font-semibold text-gray-900 dark:text-white"
      >
        {title}
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {expanded && (
        <>
          <ul className="pb-2">{children}</ul>
          {onShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              className="text-sm text-maily hover:underline pb-2"
            >
              Mostrar más
            </button>
          )}
        </>
      )}
    </div>
  );
};

const CategoryItem = ({ slug, name, count, checked, onSelect }) => (
  <li className="flex items-center gap-2 py-1.5">
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onSelect(slug)}
      className="rounded border-gray-300 dark:border-gray-600 text-maily focus:ring-maily"
    />
    <button
      type="button"
      onClick={() => onSelect(slug)}
      className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate hover:text-maily"
    >
      {name}
    </button>
    {count != null && (
      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">({count})</span>
    )}
  </li>
);

const CoursesList = ({ sectionSlug }) => {
  const { currentSection } = useSection();
  const effectiveSlug = sectionSlug || currentSection;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [subcategoriesExpanded, setSubcategoriesExpanded] = useState(true);
  const [categoriesShowAll, setCategoriesShowAll] = useState(false);
  const [subcategoriesShowAll, setSubcategoriesShowAll] = useState(false);

  useEffect(() => {
    if (!effectiveSlug) return;
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCategory) params.category = selectedCategory;
        const res = await courseService.listBySection(effectiveSlug, params);
        setCourses(res.results || res);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [effectiveSlug, selectedCategory]);

  useEffect(() => {
    if (!effectiveSlug) return;
    const loadCategories = async () => {
      try {
        const res = await categoryService.list({ section: effectiveSlug });
        setCategories(Array.isArray(res) ? res : (res.results || res));
      } catch {
        // silencioso
      }
    };
    loadCategories();
  }, [effectiveSlug]);

  const { parentCategories, subcategories } = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    const parent = list.filter((c) => !c.parent);
    const sub = list.filter((c) => c.parent);
    return { parentCategories: parent, subcategories: sub };
  }, [categories]);

  const filteredCourses = useMemo(() => {
    let result = [...courses];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (selectedLevel) result = result.filter((c) => c.level === selectedLevel);
    return result;
  }, [courses, searchQuery, selectedLevel]);

  const handleSelectCategory = (slug) => {
    setSelectedCategory((prev) => (prev === slug ? '' : slug));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cursos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{filteredCourses.length} cursos disponibles</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar izquierdo: Categorías y Subcategorías */}
        <aside className="w-56 shrink-0">
          <Card className="p-4 sticky top-4">
            <SidebarSection
              title="Categorías"
              expanded={categoriesExpanded}
              onToggle={() => setCategoriesExpanded((e) => !e)}
              onShowMore={parentCategories.length > INITIAL_CATEGORIES_SHOWN && !categoriesShowAll ? () => setCategoriesShowAll(true) : null}
            >
              <CategoryItem
                slug=""
                name="Todas"
                count={null}
                checked={!selectedCategory}
                onSelect={handleSelectCategory}
              />
              {(categoriesShowAll ? parentCategories : parentCategories.slice(0, INITIAL_CATEGORIES_SHOWN)).map((cat) => (
                <CategoryItem
                  key={cat.id}
                  slug={cat.slug}
                  name={cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
                  count={cat.courses_count ?? null}
                  checked={selectedCategory === cat.slug}
                  onSelect={handleSelectCategory}
                />
              ))}
            </SidebarSection>
            {subcategories.length > 0 && (
              <SidebarSection
                title="Subcategorías"
                expanded={subcategoriesExpanded}
                onToggle={() => setSubcategoriesExpanded((e) => !e)}
                onShowMore={subcategories.length > INITIAL_SUBCATEGORIES_SHOWN && !subcategoriesShowAll ? () => setSubcategoriesShowAll(true) : null}
              >
                {(subcategoriesShowAll ? subcategories : subcategories.slice(0, INITIAL_SUBCATEGORIES_SHOWN)).map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    slug={cat.slug}
                    name={cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
                    count={cat.courses_count ?? null}
                    checked={selectedCategory === cat.slug}
                    onSelect={handleSelectCategory}
                  />
                ))}
              </SidebarSection>
            )}
          </Card>
        </aside>

        {/* Contenido principal: búsqueda, nivel y grid */}
        <div className="flex-1 min-w-0">
          <Card className="p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar cursos..."
                  icon={<Search size={18} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {['', 'beginner', 'intermediate', 'advanced'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLevel(l)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLevel === l
                        ? 'bg-maily text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
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
      </div>
    </div>
  );
};

export default CoursesList;
