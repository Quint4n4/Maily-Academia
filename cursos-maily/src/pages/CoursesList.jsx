import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge, Input } from '../components/ui';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import courseService from '../services/courseService';
import categoryService from '../services/categoryService';
import { useSection } from '../context/SectionContext';
import { isCamsa } from '../theme/camsaTheme';

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
  const isC = isCamsa(currentSection);
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
      <div className="font-plus-jakarta-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-4">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-8 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-10 w-full" />
          ))}
        </aside>
        {/* Grid de cursos skeleton */}
        <section className="flex-1 min-w-0">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Tarjeta destacada skeleton */}
            <div className="md:col-span-2 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-64 w-full" />
            {/* Tarjetas normales */}
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="font-plus-jakarta-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* Sidebar Filters */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-10">
        <div>
          <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${ isC ? 'text-[#e6c364]' : 'text-on-surface' }`}>
            <span className={`material-symbols-outlined ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary' }`}>filter_list</span>
            Categorías
          </h3>
          <ul className="space-y-3">
            <li 
              className={`flex items-center justify-between group cursor-pointer p-3 rounded-xl transition-colors ${
                !selectedCategory 
                  ? isC ? 'bg-[#c9a84c]/20' : 'bg-primary-fixed/20' 
                  : isC ? 'hover:bg-white/5' : 'hover:bg-surface-container-low'
              }`}
              onClick={() => handleSelectCategory('')}
            >
              <span className={`font-medium ${
                !selectedCategory 
                  ? isC ? 'font-bold text-[#e6c364]' : 'font-bold text-stitch-primary' 
                  : isC ? 'text-[#8a8578] group-hover:text-[#e6c364]' : 'text-on-surface-variant group-hover:text-stitch-primary'
              }`}>Todas</span>
            </li>
            {(categoriesShowAll ? parentCategories : parentCategories.slice(0, INITIAL_CATEGORIES_SHOWN)).map((cat) => (
              <li 
                key={cat.id}
                className={`flex items-center justify-between group cursor-pointer p-3 rounded-xl transition-colors ${
                  selectedCategory === cat.slug 
                    ? isC ? 'bg-[#c9a84c]/20' : 'bg-primary-fixed/20' 
                    : isC ? 'hover:bg-white/5' : 'hover:bg-surface-container-low'
                }`}
                onClick={() => handleSelectCategory(cat.slug)}
              >
                <span className={`font-medium truncate max-w-[150px] ${
                  selectedCategory === cat.slug 
                    ? isC ? 'font-bold text-[#e6c364]' : 'font-bold text-stitch-primary' 
                    : isC ? 'text-[#8a8578] group-hover:text-[#e6c364]' : 'text-on-surface-variant group-hover:text-stitch-primary'
                }`}>{cat.name}</span>
                {cat.courses_count != null && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                    selectedCategory === cat.slug 
                      ? isC ? 'bg-[#e6c364] text-[#141311]' : 'bg-primary-container text-on-primary-container' 
                      : isC ? 'bg-[#141311] text-[#8a8578] border border-[rgba(230,195,100,0.1)]' : 'bg-surface-container-highest text-on-surface-variant/70'
                  }`}>{cat.courses_count}</span>
                )}
              </li>
            ))}
          </ul>
          {parentCategories.length > INITIAL_CATEGORIES_SHOWN && !categoriesShowAll && (
            <button
               type="button"
               onClick={() => setCategoriesShowAll(true)}
               className={`text-xs font-bold hover:underline mt-4 ml-3 ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary' }`}
             >
               Mostrar más +
             </button>
          )}
        </div>
        
        {/* Nivel de dificultad */}
        <div>
          <h3 className={`font-bold text-lg mb-6 ${ isC ? 'text-[#e6c364]' : 'text-on-surface' }`}>Nivel de dificultad</h3>
          <div className="space-y-4">
            {['', 'beginner', 'intermediate', 'advanced'].map((l) => (
              <label key={l} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={selectedLevel === l}
                  onChange={() => setSelectedLevel(l)}
                  className={`rounded border-outline-variant w-5 h-5 ${
                    isC 
                      ? 'border-[rgba(230,195,100,0.3)] bg-[#141311] text-[#c9a84c] focus:ring-[#c9a84c]' 
                      : 'text-stitch-primary focus:ring-primary-container bg-surface-container-lowest'
                  }`} 
                />
                <span className={`text-sm font-medium transition-colors ${
                  selectedLevel === l 
                    ? isC ? 'text-[#e6c364] font-bold' : 'text-stitch-primary font-bold' 
                    : isC ? 'text-[#8a8578] group-hover:text-[#f5f0e8]' : 'text-on-surface-variant group-hover:text-on-surface'
                }`}>
                  {l ? LEVEL_LABELS[l] : 'Todos'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Promo Sidebar */}
        <div className={`mt-auto p-6 rounded-[1.5rem] relative overflow-hidden hidden xl:block ${
          isC ? 'bg-[#c9a84c]/10 border border-[rgba(230,195,100,0.2)]' : 'bg-primary-fixed/30'
        }`}>
          <div className="relative z-10">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${ isC ? 'text-[#c9a84c]' : 'text-on-primary-fixed-variant' }`}>Pro Access</p>
            <h4 className={`text-xl font-bold mb-4 ${ isC ? 'text-[#e6c364]' : 'text-on-primary-fixed' }`}>Aprendizaje Ilimitado</h4>
            <Link to="/subscription" className={`block text-center w-full py-3 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-transform shadow-md ${
              isC ? 'bg-[#e6c364] text-[#141311] shadow-[#e6c364]/10' : 'bg-stitch-primary text-on-primary shadow-stitch-primary/20'
            }`}>Suscribirse</Link>
          </div>
          <span className={`material-symbols-outlined absolute -bottom-4 -right-4 text-7xl opacity-10 rotate-12 ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary' }`}>school</span>
        </div>
      </aside>

      {/* Mobile Filters Toggle */}
      <div className="lg:hidden flex flex-col gap-4 mb-4">
          <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
            {['', 'beginner', 'intermediate', 'advanced'].map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLevel(l)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors shadow-sm ${
                  selectedLevel === l
                    ? 'bg-stitch-primary text-white border-transparent'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'
                }`}
              >
                {l ? LEVEL_LABELS[l] : 'Todos'}
              </button>
            ))}
          </div>
      </div>

      {/* Catalog Content */}
      <section className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-6">
          <div>
            <p className={`font-bold uppercase tracking-[0.2em] text-[10px] mb-2 ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary' }`}>Explora la excelencia</p>
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-on-surface' }`}>Catálogo de Cursos</h1>
          </div>
          
          {/* Controls: Search & Sort */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className={`flex items-center px-4 py-2.5 rounded-full border focus-within:ring-2 transition-all w-full sm:w-64 ${
              isC 
                ? 'bg-[#141311] border-[rgba(230,195,100,0.2)] ring-[#c9a84c]/40' 
                : 'bg-surface-container-highest border-outline-variant/30 ring-primary-container'
            }`}>
              <span className={`material-symbols-outlined opacity-50 text-sm ${ isC ? 'text-[#e6c364]' : '' }`}>search</span>
              <input 
                type="text"
                placeholder="Buscar cursos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent border-none focus:ring-0 text-sm w-full outline-none ml-2 font-medium ${
                  isC 
                    ? 'text-[#f5f0e8] placeholder:text-[#d0c5b2]/30' 
                    : 'text-on-surface placeholder:text-on-surface-variant/60'
                }`} 
              />
            </div>
            <div className="flex items-center gap-2 text-sm w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-start">
              <span className={`whitespace-nowrap sm:hidden lg:inline ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant/80' }`}>Mostrando <b>{filteredCourses.length}</b></span>
              <select className={`bg-transparent border-none focus:ring-0 font-bold cursor-pointer text-sm outline-none px-2 py-1 rounded-md transition-colors ${
                isC ? 'text-[#e6c364] hover:bg-white/5' : 'text-on-surface hover:bg-surface-container-low'
              }`}>
                <option value="recent">Más recientes</option>
                <option value="popular">Más populares</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bento Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Large Featured Card (First element if exists) */}
          {filteredCourses.length > 0 && (
            <div className={`md:col-span-2 group relative rounded-2xl sm:rounded-[2rem] overflow-hidden transition-all duration-500 border ${
              isC 
                ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] hover:border-[rgba(230,195,100,0.35)] shadow-black/20' 
                : 'bg-surface-container-lowest shadow-[0_40px_40px_-10px_rgba(27,28,25,0.04)] hover:shadow-[0_40px_60px_-10px_rgba(27,28,25,0.08)] border-outline-variant/10'
            }`}>
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-[50%] relative h-64 sm:h-80 lg:h-auto overflow-hidden">
                  <img src={filteredCourses[0].thumbnail} alt={filteredCourses[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-6 left-6 flex gap-2">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${ isC ? 'bg-[#141311] text-[#e6c364] border border-[rgba(230,195,100,0.2)]' : 'bg-[#2a1800] text-white' }`}>
                      {LEVEL_LABELS[filteredCourses[0].level] || filteredCourses[0].level}
                    </span>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${ isC ? 'bg-[#c9a84c]/20 text-[#e6c364]' : 'bg-primary-container text-on-primary-container' }`}>Destacado</span>
                  </div>
                </div>
                <div className="lg:w-[50%] p-8 sm:p-10 flex flex-col justify-between">
                  <div>
                    <h2 className={`text-2xl sm:text-3xl font-extrabold mb-4 leading-tight transition-colors ${ isC ? 'text-[#f5f0e8] group-hover:text-[#e6c364]' : 'text-on-surface group-hover:text-stitch-primary' }`}>{filteredCourses[0].title}</h2>
                    <p className={`leading-relaxed mb-6 opacity-80 line-clamp-3 ${ isC ? 'text-[#d0c5b2]' : 'text-on-surface-variant' }`}>{filteredCourses[0].description}</p>
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                          isC ? 'bg-[#141311] border-[rgba(230,195,100,0.2)] text-[#e6c364]' : 'bg-surface-container-high border-stitch-primary/20 text-stitch-primary'
                        }`}>
                          {filteredCourses[0].instructor_name?.[0] || 'C'}
                        </div>
                        <span className={`text-sm font-bold ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface' }`}>{filteredCourses[0].instructor_name}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${ isC ? 'text-[#8a8578]' : 'text-outline' }`}>
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span className="text-sm">{filteredCourses[0].duration}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${ isC ? 'text-[#8a8578]' : 'text-outline' }`}>
                        <span className="material-symbols-outlined text-base">play_circle</span>
                        <span className="text-sm">{filteredCourses[0].total_lessons} Lecc.</span>
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between pt-6 border-t ${ isC ? 'border-[rgba(77,70,55,0.2)]' : 'border-surface-container' }`}>
                    <Link to={`/course/${filteredCourses[0].id}`} className={`px-6 sm:px-8 py-3.5 rounded-full font-bold flex items-center gap-2 hover:translate-y-[-2px] transition-transform text-sm sm:text-base ${
                      isC ? 'bg-[#e6c364] text-[#141311]' : 'bg-stitch-primary text-on-primary'
                    }`}>
                      Entrar al Curso
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-stitch-primary' }`}>{(!filteredCourses[0].price || Number(filteredCourses[0].price) === 0) ? 'GRATIS' : `$${Number(filteredCourses[0].price).toFixed(2)}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard Course Cards */}
          {filteredCourses.slice(1).map((course, index) => (
            <>
              {/* Promotional Card injected artificially */}
              {index === 2 && (
                <div key="promo-card" className={`group rounded-2xl sm:rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden shadow-lg ${
                  isC ? 'bg-[#c9a84c]/20 border border-[rgba(230,195,100,0.2)]' : 'bg-stitch-primary text-on-primary shadow-[0_40px_40px_-10px_rgba(132,84,0,0.15)]'
                }`}>
                  <div className="relative z-10">
                    <span className={`material-symbols-outlined text-4xl mb-6 ${ isC ? 'text-[#e6c364]' : 'text-primary-container' }`}>card_membership</span>
                    <h3 className={`text-2xl sm:text-3xl font-black leading-tight mb-4 ${ isC ? 'text-[#f5f0e8]' : '' }`}>Certifícate con Partners Globales</h3>
                    <p className={`mb-6 font-medium leading-relaxed ${ isC ? 'text-[#d0c5b2]' : 'text-on-primary/90' }`}>Completa los cursos de nuestros partners y obtén credenciales con reconocimiento médico y corporativo internacional de alto nivel.</p>
                  </div>
                  <Link to="/subscription" className={`relative z-10 px-6 py-3 rounded-full font-extrabold text-sm self-start transition-colors shadow-sm ${
                    isC ? 'bg-[#e6c364] text-[#141311] hover:bg-[#c9a84c]' : 'bg-white text-stitch-primary hover:bg-primary-container hover:text-on-primary-container'
                  }`}>Explorar Planes</Link>
                  <div className={`absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 ${ isC ? 'bg-[#e6c364]' : 'bg-white' }`}></div>
                </div>
              )}
              
              <div key={course.id} className={`group rounded-2xl sm:rounded-[1.5rem] overflow-hidden transition-all duration-500 border flex flex-col ${
                isC 
                  ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] hover:border-[rgba(230,195,100,0.35)]' 
                  : 'bg-surface-container-lowest shadow-[0_40px_40px_-10px_rgba(27,28,25,0.04)] hover:shadow-[0_40px_60px_-10px_rgba(27,28,25,0.08)] border-outline-variant/10'
              }`}>
                <div className="relative h-56 overflow-hidden">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <span className={`absolute top-4 left-4 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${
                    isC
                      ? 'bg-[#141311] text-[#e6c364] border border-[rgba(230,195,100,0.2)]'
                      : course.level === 'beginner' ? 'bg-emerald-600' : course.level === 'intermediate' ? 'bg-[#2a1800]' : 'bg-red-600'
                  }`}>
                    {LEVEL_LABELS[course.level] || course.level}
                  </span>
                </div>
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className={`text-xl font-bold mb-3 transition-colors line-clamp-2 leading-tight ${ isC ? 'text-[#f5f0e8] group-hover:text-[#e6c364]' : 'text-on-surface group-hover:text-stitch-primary' }`}>{course.title}</h3>
                    <p className={`text-sm mb-6 ${ isC ? 'text-[#8a8578]' : 'text-outline' }`}>Inst. {course.instructor_name}</p>
                    <div className={`flex items-center gap-4 mb-8 text-xs font-bold ${ isC ? 'text-[#d0c5b2]' : 'text-on-surface-variant' }`}>
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">schedule</span> {course.duration}</span>
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">auto_stories</span> {course.total_lessons} Lecc.</span>
                    </div>
                  </div>
                  <div className={`flex items-center justify-between mt-auto pt-2 border-t ${ isC ? 'border-[rgba(77,70,55,0.2)]' : 'border-transparent' }`}>
                    <Link to={`/course/${course.id}`} className={`font-bold text-sm flex items-center gap-1 group/btn hover:underline ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary' }`}>
                      Ver Ficha
                      <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">east</span>
                    </Link>
                    <span className={`text-2xl font-black tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-stitch-primary' }`}>{(!course.price || Number(course.price) === 0) ? 'GRATIS' : `$${Number(course.price).toFixed(2)}`}</span>
                  </div>
                </div>
              </div>
            </>
          ))}
          
        </div>
      </section>
    </div>
  );
};

export default CoursesList;
