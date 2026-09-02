// Landing page configuration for each academy section
// Extend this object to add more sections or update copy/branding

import logoLongevity from '../../../Logos/Longevity360-03.png';
import logoMaily from '../../../Logos/logomaily.png';
import logoCorporativo from '../../../Logos/logocorporativo.png';

export const LANDING_CONFIG = {
  'longevity-360': {
    slug: 'longevity-360',
    name: 'Longevity 360',
    logo: logoLongevity,
    logoBg: false,
    tagline: 'Camsa World Academy Presenta',
    headline: 'Transforma tu salud y bienestar con',
    headlineHighlight: 'conocimiento real',
    subheadline:
      'Cursos diseñados por expertos en longevidad, nutrición y bienestar integral para optimizar cada aspecto de tu vida biológica y mental.',
    heroGradient: 'from-[#006780] to-[#00b4d8]',
    accentColor: 'text-[#006780]',
    buttonColor: 'text-[#006780]',
    stats: [
      { value: '12', label: 'Cursos disponibles' },
      { value: '200+', label: 'Alumnos activos' },
      { value: '8', label: 'Instructores expertos' },
    ],
    courses: [
      {
        title: 'Longevidad Biológica',
        subtitle: 'Salud celular y antienvejecimiento',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
      },
      {
        title: 'Nutrición Funcional',
        subtitle: 'Alimentación basada en evidencia',
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80',
      },
      {
        title: 'Movimiento y Vitalidad',
        subtitle: 'Fitness para una vida larga y activa',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
      },
    ],
    benefits: [
      { icon: 'refresh', title: 'Contenido actualizado', desc: 'Información revisada trimestralmente con los últimos estudios.' },
      { icon: 'shield', title: 'Instructores certificados', desc: 'Profesionales con trayectoria clínica y académica real.' },
      { icon: 'monitoring', title: 'Progreso personalizado', desc: 'Dashboards interactivos para medir tu evolución.' },
      { icon: 'download', title: 'Material descargable', desc: 'Guías, recetarios y protocolos en PDF para uso diario.' },
    ],
    whyTitle: '¿Por qué Longevity 360?',
    whyDescription:
      'No somos solo videos; somos una metodología basada en evidencia científica para extender tu juventud biológica.',
    quote: 'La longevidad no es vivir más, es vivir mejor por mucho más tiempo.',
    footerTagline: 'Elevando el estándar de la educación en salud integral. Un ecosistema de aprendizaje de Camsa World Academy.',
    copyright: 'Longevity 360 by Camsa World Academy. The Art of Living Longer.',
    ctaHeadline: '¿Listo para comenzar tu transformación?',
    navLinks: ['Academia', 'Cursos', 'Beneficios', 'Nosotros'],
  },

  'maily-academia': {
    slug: 'maily-academia',
    name: 'Maily Academia',
    logo: logoMaily,
    logoBg: false,
    tagline: 'Camsa World Academy Presenta',
    headline: 'Domina el ecosistema digital con',
    headlineHighlight: 'formación de vanguardia',
    subheadline:
      'Formación avanzada en tecnología, modelos de negocios y emprendimiento digital para el ecosistema Maily y más allá.',
    heroGradient: 'from-[#845400] to-[#ffb347]',
    accentColor: 'text-[#845400]',
    buttonColor: 'text-[#845400]',
    stats: [
      { value: '10+', label: 'Cursos disponibles' },
      { value: '300+', label: 'Alumnos activos' },
      { value: '6', label: 'Instructores expertos' },
    ],
    courses: [
      {
        title: 'Marketing Digital Avanzado',
        subtitle: 'Estrategias para el ecosistema Maily',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
      },
      {
        title: 'Emprendimiento Digital',
        subtitle: 'De la idea al modelo de negocio',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
      },
      {
        title: 'Tecnología y Plataformas',
        subtitle: 'Domina las herramientas digitales',
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80',
      },
    ],
    videos: [
      { id: 'jipfi0YuPOA', title: 'Conoce Maily' },
      { id: '6YAdMMy1C-g', title: 'Ecosistema Digital' },
      { id: '70pY3LoUtNE', title: 'Oportunidades de Negocio' },
    ],
    benefits: [
      { icon: 'rocket_launch', title: 'Enfoque práctico', desc: 'Proyectos reales integrados en cada módulo del programa.' },
      { icon: 'hub', title: 'Ecosistema Maily', desc: 'Acceso directo a herramientas y plataformas del ecosistema.' },
      { icon: 'monitoring', title: 'Seguimiento personalizado', desc: 'Métricas de progreso y retroalimentación continua.' },
      { icon: 'groups', title: 'Network exclusivo', desc: 'Comunidad de emprendedores y líderes tecnológicos.' },
    ],
    whyTitle: '¿Por qué Maily Academia?',
    whyDescription: 'El único programa que combina capacitación técnica con mentoría dentro del ecosistema Maily.',
    quote: 'El conocimiento es el mejor activo que puedes construir en la economía digital.',
    footerTagline: 'Formando líderes digitales para el mundo de mañana. Un ecosistema de aprendizaje de Camsa World Academy.',
    copyright: 'Maily Academia by Camsa World Academy.',
    ctaHeadline: '¿Listo para transformar tu carrera digital?',
    navLinks: ['Academia', 'Cursos', 'Beneficios', 'Comunidad'],
  },

  'corporativo-camsa': {
    slug: 'corporativo-camsa',
    name: 'Corporativo CAMSA',
    logo: logoCorporativo,
    logoBg: true,
    heroVideo: '/corporativo_logo.mp4',
    tagline: 'Camsa World Academy Presenta',
    headline: 'Potencia el talento de tu organización con',
    headlineHighlight: 'capacitación de alto impacto',
    subheadline:
      'Programas de capacitación técnica y soft skills exclusivos para colaboradores del grupo corporativo CAMSA.',
    heroGradient: 'from-[#1b1c19] to-[#30312e]',
    accentColor: 'text-white',
    buttonColor: 'text-[#1b1c19]',
    stats: [
      { value: '20+', label: 'Programas activos' },
      { value: '1000+', label: 'Colaboradores capacitados' },
      { value: '15', label: 'Áreas de especialidad' },
    ],
    courses: [
      {
        title: 'Liderazgo Organizacional',
        subtitle: 'Habilidades para líderes de alto impacto',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
      },
      {
        title: 'Comunicación Efectiva',
        subtitle: 'Presentaciones y negociación corporativa',
        image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80',
      },
      {
        title: 'Cultura y Trabajo en Equipo',
        subtitle: 'Construye equipos de alto desempeño',
        image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80',
      },
    ],
    benefits: [
      { icon: 'corporate_fare', title: 'Contenido corporativo', desc: 'Diseñado específicamente para el entorno CAMSA.' },
      { icon: 'verified', title: 'Avalado por RRHH', desc: 'Programas validados por el departamento de Recursos Humanos.' },
      { icon: 'trending_up', title: 'Medición de impacto', desc: 'KPIs de capacitación integrados con sistemas corporativos.' },
      { icon: 'lock_person', title: 'Acceso exclusivo', desc: 'Solo disponible para colaboradores activos del corporativo.' },
    ],
    whyTitle: '¿Por qué Corporativo CAMSA?',
    whyDescription: 'Un programa de capacitación diseñado desde adentro, para las necesidades reales de nuestra organización.',
    quote: 'Las organizaciones que aprenden son las organizaciones que perduran.',
    footerTagline: 'Capacitación de alto impacto para el grupo corporativo CAMSA.',
    copyright: 'Corporativo CAMSA by Camsa World Academy.',
    ctaHeadline: '¿Listo para potenciar tu desarrollo?',
    navLinks: ['Programas', 'Áreas', 'Beneficios', 'Contacto'],
  },
};

export const ACADEMY_ORDER = ['longevity-360', 'maily-academia', 'corporativo-camsa'];
