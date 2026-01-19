// Datos de ejemplo para los cursos de Maily Te Cuida
export const coursesData = [
  {
    id: 1,
    title: "Fundamentos de Maily",
    description: "Aprende desde cero a utilizar todas las funcionalidades básicas del software Maily. Este curso te guiará paso a paso.",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
    instructor: "María García",
    duration: "4 horas",
    totalLessons: 12,
    level: "Principiante",
    rating: 4.8,
    students: 1250,
    modules: [
      {
        id: 1,
        title: "Módulo 1: Introducción y Configuración",
        description: "Conoce la interfaz y configura tu entorno de trabajo",
        lessons: [
          {
            id: 1,
            title: "Bienvenida al curso",
            duration: "5:30",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Introducción al curso y objetivos de aprendizaje",
            completed: false
          },
          {
            id: 2,
            title: "Instalación del software",
            duration: "12:45",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Guía paso a paso para instalar Maily en tu computadora",
            completed: false
          },
          {
            id: 3,
            title: "Conociendo la interfaz",
            duration: "18:20",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Tour completo por la interfaz principal del software",
            completed: false
          },
          {
            id: 4,
            title: "Configuración inicial",
            duration: "10:15",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Personaliza tu entorno de trabajo según tus necesidades",
            completed: false
          }
        ],
        quiz: {
          id: 1,
          title: "Quiz: Introducción y Configuración",
          questions: [
            {
              id: 1,
              question: "¿Cuál es el primer paso al abrir Maily por primera vez?",
              options: [
                "Crear una cuenta de usuario",
                "Configurar las preferencias",
                "Importar datos existentes",
                "Actualizar el software"
              ],
              correctAnswer: 0
            },
            {
              id: 2,
              question: "¿Dónde se encuentran las opciones de configuración principal?",
              options: [
                "En el menú Archivo",
                "En el menú Configuración",
                "En la barra de herramientas",
                "En el panel lateral"
              ],
              correctAnswer: 1
            },
            {
              id: 3,
              question: "¿Qué formato de archivo utiliza Maily para los proyectos?",
              options: [
                ".mly",
                ".doc",
                ".pdf",
                ".xlsx"
              ],
              correctAnswer: 0
            }
          ],
          passingScore: 70
        }
      },
      {
        id: 2,
        title: "Módulo 2: Funciones Básicas",
        description: "Domina las operaciones fundamentales del día a día",
        lessons: [
          {
            id: 5,
            title: "Creando tu primer proyecto",
            duration: "15:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Aprende a crear y gestionar proyectos desde cero",
            completed: false
          },
          {
            id: 6,
            title: "Importación de datos",
            duration: "20:30",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Cómo importar información de diferentes fuentes",
            completed: false
          },
          {
            id: 7,
            title: "Navegación y búsqueda",
            duration: "12:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Técnicas para encontrar rápidamente lo que necesitas",
            completed: false
          },
          {
            id: 8,
            title: "Edición básica de registros",
            duration: "18:45",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Modifica y actualiza información de manera eficiente",
            completed: false
          }
        ],
        quiz: {
          id: 2,
          title: "Quiz: Funciones Básicas",
          questions: [
            {
              id: 1,
              question: "¿Cuántos tipos de proyectos se pueden crear en Maily?",
              options: [
                "2 tipos",
                "3 tipos",
                "4 tipos",
                "5 tipos"
              ],
              correctAnswer: 2
            },
            {
              id: 2,
              question: "¿Qué atajo de teclado abre la búsqueda rápida?",
              options: [
                "Ctrl + F",
                "Ctrl + B",
                "Ctrl + S",
                "Ctrl + N"
              ],
              correctAnswer: 0
            },
            {
              id: 3,
              question: "¿Desde qué formatos se pueden importar datos?",
              options: [
                "Solo Excel",
                "Excel y CSV",
                "Excel, CSV y JSON",
                "Todos los formatos mencionados más XML"
              ],
              correctAnswer: 3
            }
          ],
          passingScore: 70
        }
      },
      {
        id: 3,
        title: "Módulo 3: Reportes y Exportación",
        description: "Genera informes profesionales y comparte tu trabajo",
        lessons: [
          {
            id: 9,
            title: "Generación de reportes básicos",
            duration: "16:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Crea reportes estandarizados de forma rápida",
            completed: false
          },
          {
            id: 10,
            title: "Personalización de reportes",
            duration: "22:15",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Adapta los reportes a tus necesidades específicas",
            completed: false
          },
          {
            id: 11,
            title: "Exportación en diferentes formatos",
            duration: "14:30",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "PDF, Excel, y otros formatos de exportación",
            completed: false
          },
          {
            id: 12,
            title: "Compartir y colaborar",
            duration: "11:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Trabaja en equipo y comparte tu trabajo fácilmente",
            completed: false
          }
        ],
        quiz: {
          id: 3,
          title: "Quiz: Reportes y Exportación",
          questions: [
            {
              id: 1,
              question: "¿Cuál es el formato recomendado para compartir reportes oficiales?",
              options: [
                "Excel",
                "PDF",
                "Word",
                "HTML"
              ],
              correctAnswer: 1
            },
            {
              id: 2,
              question: "¿Se pueden programar reportes automáticos?",
              options: [
                "No, solo manuales",
                "Sí, diariamente",
                "Sí, con múltiples frecuencias",
                "Solo en la versión premium"
              ],
              correctAnswer: 2
            },
            {
              id: 3,
              question: "¿Cuántos usuarios pueden colaborar simultáneamente en un proyecto?",
              options: [
                "Hasta 5",
                "Hasta 10",
                "Hasta 25",
                "Sin límite"
              ],
              correctAnswer: 3
            }
          ],
          passingScore: 70
        }
      }
    ]
  },
  {
    id: 2,
    title: "Maily Avanzado",
    description: "Lleva tus habilidades al siguiente nivel con funciones avanzadas, automatizaciones y trucos de productividad.",
    thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop",
    instructor: "Carlos Rodríguez",
    duration: "6 horas",
    totalLessons: 15,
    level: "Avanzado",
    rating: 4.9,
    students: 890,
    modules: [
      {
        id: 1,
        title: "Módulo 1: Automatizaciones",
        description: "Crea flujos de trabajo automáticos",
        lessons: [
          {
            id: 1,
            title: "Introducción a las automatizaciones",
            duration: "10:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Qué son y cómo pueden ayudarte",
            completed: false
          },
          {
            id: 2,
            title: "Creando tu primera automatización",
            duration: "25:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Paso a paso para crear flujos automáticos",
            completed: false
          },
          {
            id: 3,
            title: "Triggers y condiciones",
            duration: "20:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Configura cuándo y cómo se ejecutan",
            completed: false
          },
          {
            id: 4,
            title: "Casos de uso prácticos",
            duration: "30:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Ejemplos reales de automatización",
            completed: false
          },
          {
            id: 5,
            title: "Solución de problemas comunes",
            duration: "15:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Debugging y optimización",
            completed: false
          }
        ],
        quiz: {
          id: 1,
          title: "Quiz: Automatizaciones",
          questions: [
            {
              id: 1,
              question: "¿Qué es un trigger en automatización?",
              options: [
                "Una acción final",
                "El evento que inicia la automatización",
                "Un tipo de reporte",
                "Una configuración de usuario"
              ],
              correctAnswer: 1
            },
            {
              id: 2,
              question: "¿Cuántas condiciones puede tener una automatización?",
              options: [
                "Máximo 3",
                "Máximo 5",
                "Máximo 10",
                "Sin límite"
              ],
              correctAnswer: 3
            },
            {
              id: 3,
              question: "¿Cuál es la mejor práctica al crear automatizaciones?",
              options: [
                "Crear una grande que haga todo",
                "Dividir en pequeñas automatizaciones específicas",
                "No usar condiciones",
                "Ejecutar siempre manualmente primero"
              ],
              correctAnswer: 1
            }
          ],
          passingScore: 70
        }
      },
      {
        id: 2,
        title: "Módulo 2: Integraciones",
        description: "Conecta Maily con otras herramientas",
        lessons: [
          {
            id: 6,
            title: "Visión general de integraciones",
            duration: "12:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Herramientas compatibles con Maily",
            completed: false
          },
          {
            id: 7,
            title: "Integración con Excel",
            duration: "18:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Sincronización bidireccional",
            completed: false
          },
          {
            id: 8,
            title: "Integración con Google Workspace",
            duration: "20:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Calendar, Drive y más",
            completed: false
          },
          {
            id: 9,
            title: "APIs y webhooks",
            duration: "25:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Para desarrolladores y usuarios avanzados",
            completed: false
          },
          {
            id: 10,
            title: "Casos de integración empresarial",
            duration: "22:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Ejemplos de grandes implementaciones",
            completed: false
          }
        ],
        quiz: {
          id: 2,
          title: "Quiz: Integraciones",
          questions: [
            {
              id: 1,
              question: "¿Qué es un webhook?",
              options: [
                "Un tipo de reporte",
                "Una notificación automática a sistemas externos",
                "Un formato de archivo",
                "Una herramienta de diseño"
              ],
              correctAnswer: 1
            },
            {
              id: 2,
              question: "¿Con qué servicio de Google NO se integra Maily?",
              options: [
                "Google Calendar",
                "Google Drive",
                "Google Photos",
                "Google Sheets"
              ],
              correctAnswer: 2
            },
            {
              id: 3,
              question: "¿Qué protocolo usa la API de Maily?",
              options: [
                "SOAP",
                "GraphQL",
                "REST",
                "gRPC"
              ],
              correctAnswer: 2
            }
          ],
          passingScore: 70
        }
      },
      {
        id: 3,
        title: "Módulo 3: Análisis Avanzado",
        description: "Dashboards y métricas personalizadas",
        lessons: [
          {
            id: 11,
            title: "Creación de dashboards",
            duration: "28:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Visualiza tus datos de forma efectiva",
            completed: false
          },
          {
            id: 12,
            title: "KPIs y métricas personalizadas",
            duration: "22:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Define lo que realmente importa medir",
            completed: false
          },
          {
            id: 13,
            title: "Filtros y segmentación avanzada",
            duration: "18:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Analiza datos específicos",
            completed: false
          },
          {
            id: 14,
            title: "Exportación de análisis",
            duration: "15:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Comparte insights con tu equipo",
            completed: false
          },
          {
            id: 15,
            title: "Mejores prácticas de análisis",
            duration: "20:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Consejos de expertos",
            completed: false
          }
        ],
        quiz: {
          id: 3,
          title: "Quiz: Análisis Avanzado",
          questions: [
            {
              id: 1,
              question: "¿Qué es un KPI?",
              options: [
                "Key Personal Information",
                "Key Performance Indicator",
                "Knowledge Process Integration",
                "Key Process Index"
              ],
              correctAnswer: 1
            },
            {
              id: 2,
              question: "¿Cuántos widgets puede tener un dashboard?",
              options: [
                "Máximo 6",
                "Máximo 12",
                "Máximo 20",
                "Sin límite"
              ],
              correctAnswer: 3
            },
            {
              id: 3,
              question: "¿Cuál es la mejor práctica para dashboards?",
              options: [
                "Incluir todos los datos posibles",
                "Enfocarse en las métricas más relevantes",
                "Usar solo gráficos de barras",
                "Actualizar manualmente los datos"
              ],
              correctAnswer: 1
            }
          ],
          passingScore: 70
        }
      }
    ]
  },
  {
    id: 3,
    title: "Maily para Equipos",
    description: "Aprende a gestionar equipos de trabajo, permisos, roles y colaboración efectiva dentro de Maily.",
    thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop",
    instructor: "Ana Martínez",
    duration: "3 horas",
    totalLessons: 9,
    level: "Intermedio",
    rating: 4.7,
    students: 650,
    modules: [
      {
        id: 1,
        title: "Módulo 1: Gestión de Usuarios",
        description: "Administra tu equipo eficientemente",
        lessons: [
          {
            id: 1,
            title: "Roles y permisos",
            duration: "20:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Configura quién puede hacer qué",
            completed: false
          },
          {
            id: 2,
            title: "Invitar miembros al equipo",
            duration: "10:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Proceso de onboarding de nuevos usuarios",
            completed: false
          },
          {
            id: 3,
            title: "Grupos de trabajo",
            duration: "15:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Organiza tu equipo en grupos",
            completed: false
          }
        ],
        quiz: {
          id: 1,
          title: "Quiz: Gestión de Usuarios",
          questions: [
            {
              id: 1,
              question: "¿Cuántos roles predefinidos tiene Maily?",
              options: ["3", "4", "5", "6"],
              correctAnswer: 2
            },
            {
              id: 2,
              question: "¿Quién puede modificar los permisos de un rol?",
              options: [
                "Cualquier usuario",
                "Solo administradores",
                "Solo el propietario",
                "Administradores y propietario"
              ],
              correctAnswer: 3
            },
            {
              id: 3,
              question: "¿Se pueden crear roles personalizados?",
              options: [
                "No",
                "Sí, ilimitados",
                "Sí, hasta 10",
                "Solo en plan empresarial"
              ],
              correctAnswer: 1
            }
          ],
          passingScore: 70
        }
      },
      {
        id: 2,
        title: "Módulo 2: Colaboración en Tiempo Real",
        description: "Trabaja simultáneamente con tu equipo",
        lessons: [
          {
            id: 4,
            title: "Edición colaborativa",
            duration: "18:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Múltiples usuarios editando al mismo tiempo",
            completed: false
          },
          {
            id: 5,
            title: "Comentarios y menciones",
            duration: "12:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Comunícate dentro del software",
            completed: false
          },
          {
            id: 6,
            title: "Historial de cambios",
            duration: "15:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Rastrea quién hizo qué y cuándo",
            completed: false
          }
        ],
        quiz: {
          id: 2,
          title: "Quiz: Colaboración",
          questions: [
            {
              id: 1,
              question: "¿Cómo se menciona a un usuario?",
              options: ["#usuario", "@usuario", "/usuario", "!usuario"],
              correctAnswer: 1
            },
            {
              id: 2,
              question: "¿Por cuánto tiempo se guarda el historial?",
              options: ["30 días", "90 días", "1 año", "Indefinidamente"],
              correctAnswer: 3
            },
            {
              id: 3,
              question: "¿Se pueden resolver comentarios?",
              options: [
                "No",
                "Sí, solo el autor",
                "Sí, cualquier usuario",
                "Sí, el autor o un admin"
              ],
              correctAnswer: 3
            }
          ],
          passingScore: 70
        }
      },
      {
        id: 3,
        title: "Módulo 3: Reportes de Equipo",
        description: "Mide el rendimiento grupal",
        lessons: [
          {
            id: 7,
            title: "Dashboard de actividad",
            duration: "20:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Visualiza la actividad de tu equipo",
            completed: false
          },
          {
            id: 8,
            title: "Reportes de productividad",
            duration: "18:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Métricas de desempeño",
            completed: false
          },
          {
            id: 9,
            title: "Exportación y presentación",
            duration: "12:00",
            videoUrl: "https://www.youtube.com/embed/8mAITcNt710",
            description: "Comparte resultados con stakeholders",
            completed: false
          }
        ],
        quiz: {
          id: 3,
          title: "Quiz: Reportes de Equipo",
          questions: [
            {
              id: 1,
              question: "¿Qué métrica NO está disponible en el dashboard?",
              options: [
                "Tiempo activo",
                "Tareas completadas",
                "Velocidad de escritura",
                "Proyectos modificados"
              ],
              correctAnswer: 2
            },
            {
              id: 2,
              question: "¿Se pueden programar reportes automáticos?",
              options: [
                "No",
                "Sí, solo diarios",
                "Sí, diarios y semanales",
                "Sí, con múltiples frecuencias"
              ],
              correctAnswer: 3
            },
            {
              id: 3,
              question: "¿En qué formatos se pueden exportar los reportes?",
              options: [
                "Solo PDF",
                "PDF y Excel",
                "PDF, Excel y PowerPoint",
                "PDF, Excel, PowerPoint y HTML"
              ],
              correctAnswer: 3
            }
          ],
          passingScore: 70
        }
      }
    ]
  }
];

export default coursesData;
