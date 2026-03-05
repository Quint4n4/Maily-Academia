"""
Management command: seed_presentation

Popula la base de datos con datos demo ricos para presentaciones.
Preserva cuentas superuser/admin y borra todo lo demás.

Uso:
    python manage.py seed_presentation
"""
import random
from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.certificates.models import Certificate
from apps.courses.models import Category, Course, Module, Lesson
from apps.progress.models import Enrollment, LessonProgress, Purchase, UserActivity
from apps.quizzes.models import Quiz, Question, QuizAttempt
from apps.sections.models import Section, SectionMembership
from apps.users.models import Profile

User = get_user_model()

YT_EMBED = "https://www.youtube.com/embed/8mAITcNt710"
NOW = timezone.now()
rng = random.Random(42)  # seed fijo para resultados reproducibles


def days_ago(d, jitter_hours=8):
    return NOW - timedelta(days=d, hours=rng.randint(0, jitter_hours))


# ── Thumbnails ────────────────────────────────────────────────────────────────
THUMB = {
    "maily":                    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
    "medicina-general":         "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=250&fit=crop",
    "enfermeria":               "https://images.unsplash.com/photo-1584515933487-779824d29309?w=400&h=250&fit=crop",
    "odontologia":              "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400&h=250&fit=crop",
    "nutricion":                "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=250&fit=crop",
    "psicologia":               "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=250&fit=crop",
    "fisioterapia":             "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=250&fit=crop",
    "farmacologia":             "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=250&fit=crop",
    "tecnologia-medica":        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=250&fit=crop",
    "salud-publica":            "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&h=250&fit=crop",
    "administracion-hospitalaria": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=250&fit=crop",
    "corporativo":              "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=400&h=250&fit=crop",
}

# ── Sections ──────────────────────────────────────────────────────────────────
SECTIONS_DATA = [
    {
        "slug": "maily-academia", "name": "Maily Academia",
        "description": "Formación especializada para usuarios del software Maily.",
        "section_type": "maily", "require_credentials": True, "allow_public_preview": True,
    },
    {
        "slug": "longevity-360", "name": "Longevity 360",
        "description": "Academia abierta de salud con cursos gratuitos y de paga.",
        "section_type": "public", "require_credentials": False, "allow_public_preview": False,
    },
    {
        "slug": "corporativo-camsa", "name": "Corporativo CAMSA",
        "description": "Capacitación interna y contenidos exclusivos para el corporativo.",
        "section_type": "corporate", "require_credentials": True, "allow_public_preview": False,
    },
]

# ── Categories (Longevity) ────────────────────────────────────────────────────
CATEGORIES_DATA = [
    {"name": "Medicina General",            "slug": "medicina-general",           "icon": "stethoscope"},
    {"name": "Enfermería",                  "slug": "enfermeria",                 "icon": "heart"},
    {"name": "Odontología",                 "slug": "odontologia",                "icon": "smile"},
    {"name": "Nutrición",                   "slug": "nutricion",                  "icon": "apple"},
    {"name": "Psicología",                  "slug": "psicologia",                 "icon": "brain"},
    {"name": "Fisioterapia",                "slug": "fisioterapia",               "icon": "activity"},
    {"name": "Farmacología",                "slug": "farmacologia",               "icon": "pill"},
    {"name": "Tecnología Médica",           "slug": "tecnologia-medica",          "icon": "monitor"},
    {"name": "Salud Pública",               "slug": "salud-publica",              "icon": "shield"},
    {"name": "Administración Hospitalaria", "slug": "administracion-hospitalaria","icon": "building"},
]

# ── Instructors ───────────────────────────────────────────────────────────────
INSTRUCTORS = [
    # Maily Academia
    {"email": "maria.garcia@maily.com",   "username": "maria_garcia",   "first_name": "María",      "last_name": "García",   "phone": "5511110001", "section": "maily-academia"},
    {"email": "carlos.lopez@maily.com",   "username": "carlos_lopez",   "first_name": "Carlos",     "last_name": "López",    "phone": "5511110002", "section": "maily-academia"},
    {"email": "sofia.mendez@maily.com",   "username": "sofia_mendez",   "first_name": "Sofía",      "last_name": "Méndez",   "phone": "5511110003", "section": "maily-academia"},
    # Longevity 360
    {"email": "dr.ramirez@longevity360.com",      "username": "dr_ramirez",      "first_name": "Dr. Alejandro", "last_name": "Ramírez",  "phone": "5511110004", "section": "longevity-360"},
    {"email": "lic.torres@longevity360.com",       "username": "lic_torres",      "first_name": "Lic. Gabriela", "last_name": "Torres",   "phone": "5511110005", "section": "longevity-360"},
    {"email": "nutriologa.villa@longevity360.com", "username": "nutriologa_villa","first_name": "Dra. Laura",    "last_name": "Villa",    "phone": "5511110006", "section": "longevity-360"},
    # Corporativo CAMSA
    {"email": "rrhh.camsa@corporativo.com",        "username": "rrhh_camsa",        "first_name": "Roberto",  "last_name": "Herrera", "phone": "5511110007", "section": "corporativo-camsa"},
    {"email": "capacitacion.camsa@corporativo.com","username": "capacitacion_camsa","first_name": "Patricia", "last_name": "Vargas",  "phone": "5511110008", "section": "corporativo-camsa"},
    {"email": "seguridad.camsa@corporativo.com",   "username": "seguridad_camsa",   "first_name": "Miguel",   "last_name": "Ortega",  "phone": "5511110009", "section": "corporativo-camsa"},
]

# ── Students ──────────────────────────────────────────────────────────────────
STUDENTS = [
    # Maily Academia
    {"email": "ana.soto@demo.com",        "username": "ana_soto",        "first_name": "Ana",      "last_name": "Soto",     "phone": "5522220001", "section": "maily-academia"},
    {"email": "pedro.jimenez@demo.com",   "username": "pedro_jimenez",   "first_name": "Pedro",    "last_name": "Jiménez",  "phone": "5522220002", "section": "maily-academia"},
    {"email": "valeria.cruz@demo.com",    "username": "valeria_cruz",    "first_name": "Valeria",  "last_name": "Cruz",     "phone": "5522220003", "section": "maily-academia"},
    {"email": "luis.ramos@demo.com",      "username": "luis_ramos",      "first_name": "Luis",     "last_name": "Ramos",    "phone": "5522220004", "section": "maily-academia"},
    {"email": "diana.morales@demo.com",   "username": "diana_morales",   "first_name": "Diana",    "last_name": "Morales",  "phone": "5522220005", "section": "maily-academia"},
    # Longevity 360
    {"email": "rosa.flores@demo.com",     "username": "rosa_flores",     "first_name": "Rosa",     "last_name": "Flores",   "phone": "5522220006", "section": "longevity-360"},
    {"email": "jorge.mendoza@demo.com",   "username": "jorge_mendoza",   "first_name": "Jorge",    "last_name": "Mendoza",  "phone": "5522220007", "section": "longevity-360"},
    {"email": "carmen.vega@demo.com",     "username": "carmen_vega",     "first_name": "Carmen",   "last_name": "Vega",     "phone": "5522220008", "section": "longevity-360"},
    {"email": "fernando.castillo@demo.com","username": "fernando_castillo","first_name": "Fernando","last_name": "Castillo", "phone": "5522220009", "section": "longevity-360"},
    {"email": "isabel.guerrero@demo.com", "username": "isabel_guerrero", "first_name": "Isabel",   "last_name": "Guerrero", "phone": "5522220010", "section": "longevity-360"},
    # Corporativo CAMSA
    {"email": "ernesto.pena@demo.com",    "username": "ernesto_pena",    "first_name": "Ernesto",  "last_name": "Peña",     "phone": "5522220011", "section": "corporativo-camsa"},
    {"email": "monica.rojas@demo.com",    "username": "monica_rojas",    "first_name": "Mónica",   "last_name": "Rojas",    "phone": "5522220012", "section": "corporativo-camsa"},
    {"email": "hector.navarro@demo.com",  "username": "hector_navarro",  "first_name": "Héctor",   "last_name": "Navarro",  "phone": "5522220013", "section": "corporativo-camsa"},
    {"email": "adriana.lara@demo.com",    "username": "adriana_lara",    "first_name": "Adriana",  "last_name": "Lara",     "phone": "5522220014", "section": "corporativo-camsa"},
    {"email": "ricardo.silva@demo.com",   "username": "ricardo_silva",   "first_name": "Ricardo",  "last_name": "Silva",    "phone": "5522220015", "section": "corporativo-camsa"},
]

# ── Courses data ──────────────────────────────────────────────────────────────
# Cada módulo: { title, description, lessons:[{title,duration}], quiz:[{text,options,correct_answer,question_type?,config?}] }

MAILY_COURSES = [
    {
        "title": "Fundamentos de Maily",
        "description": "Aprende desde cero todas las funcionalidades esenciales del software Maily. Este curso te lleva paso a paso desde la instalación hasta el manejo fluido del día a día.",
        "thumbnail": THUMB["maily"],
        "instructor_email": "maria.garcia@maily.com",
        "duration": "4 horas",
        "level": "beginner",
        "rating": "4.8",
        "price": "0.00",
        "section_slug": "maily-academia",
        "modules": [
            {
                "title": "Módulo 1: Introducción y Configuración",
                "description": "Conoce la interfaz y configura tu entorno de trabajo.",
                "lessons": [
                    {"title": "Bienvenida al curso",          "duration": "05:30"},
                    {"title": "Instalación del software",     "duration": "12:45"},
                    {"title": "Conociendo la interfaz",       "duration": "18:20"},
                    {"title": "Configuración inicial",        "duration": "10:15"},
                ],
                "quiz": [
                    {"text": "¿Cuál es el primer paso al abrir Maily por primera vez?",
                     "options": ["Crear una cuenta", "Configurar preferencias", "Importar datos", "Actualizar el software"],
                     "correct_answer": 0},
                    {"text": "¿Dónde están las opciones de configuración principal?",
                     "options": ["Menú Archivo", "Menú Configuración", "Barra de herramientas", "Panel lateral"],
                     "correct_answer": 1},
                    {"text": "¿Maily funciona sin conexión a internet?",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                ],
            },
            {
                "title": "Módulo 2: Funciones Básicas",
                "description": "Domina las operaciones fundamentales del día a día.",
                "lessons": [
                    {"title": "Creando tu primer proyecto",  "duration": "15:00"},
                    {"title": "Importación de datos",        "duration": "20:30"},
                    {"title": "Navegación y búsqueda",       "duration": "12:00"},
                    {"title": "Edición básica de registros", "duration": "18:45"},
                ],
                "quiz": [
                    {"text": "¿Qué atajo de teclado abre la búsqueda rápida?",
                     "options": ["Ctrl+F", "Ctrl+B", "Ctrl+S", "Ctrl+N"],
                     "correct_answer": 0},
                    {"text": "Relaciona cada función con su descripción",
                     "question_type": "matching",
                     "options": [],
                     "correct_answer": None,
                     "config": {"pairs": [
                         {"id": 1, "left": "Importar",  "right": "Cargar datos desde un archivo externo"},
                         {"id": 2, "left": "Exportar",  "right": "Guardar datos en un formato externo"},
                         {"id": 3, "left": "Buscar",    "right": "Localizar registros por criterios"},
                     ]}},
                    {"text": "¿Desde qué formatos se pueden importar datos?",
                     "options": ["Solo Excel", "Excel y CSV", "Excel, CSV y JSON", "Excel, CSV, JSON y XML"],
                     "correct_answer": 3},
                ],
            },
            {
                "title": "Módulo 3: Reportes y Exportación",
                "description": "Genera informes profesionales y comparte tu trabajo.",
                "lessons": [
                    {"title": "Generación de reportes básicos",          "duration": "16:00"},
                    {"title": "Personalización de reportes",             "duration": "22:15"},
                    {"title": "Exportación en diferentes formatos",      "duration": "14:30"},
                    {"title": "Compartir y colaborar",                   "duration": "11:00"},
                ],
                "quiz": [
                    {"text": "¿Cuál es el formato recomendado para reportes oficiales?",
                     "options": ["Excel", "PDF", "Word", "HTML"],
                     "correct_answer": 1},
                    {"text": "¿Se pueden programar reportes automáticos en Maily?",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "Completa: Los reportes de Maily pueden exportarse a {{1}} y a {{2}}.",
                     "question_type": "fill_blank",
                     "options": [],
                     "correct_answer": None,
                     "config": {
                         "text": "Los reportes de Maily pueden exportarse a {{1}} y a {{2}}.",
                         "blanks": [
                             {"id": 1, "hint": "formato 1", "correct_answers": ["PDF", "pdf"]},
                             {"id": 2, "hint": "formato 2", "correct_answers": ["Excel", "excel", "XLSX", "xlsx"]},
                         ],
                     }},
                ],
            },
        ],
    },
    {
        "title": "Maily Avanzado: Automatizaciones y Flujos",
        "description": "Lleva tus habilidades al siguiente nivel con automatizaciones, integraciones y análisis avanzado de datos dentro del software Maily.",
        "thumbnail": THUMB["maily"],
        "instructor_email": "carlos.lopez@maily.com",
        "duration": "6 horas",
        "level": "advanced",
        "rating": "4.9",
        "price": "0.00",
        "section_slug": "maily-academia",
        "modules": [
            {
                "title": "Módulo 1: Automatizaciones",
                "description": "Crea flujos de trabajo automáticos y ahorra tiempo.",
                "lessons": [
                    {"title": "Introducción a las automatizaciones",  "duration": "10:00"},
                    {"title": "Creando tu primera automatización",    "duration": "25:00"},
                    {"title": "Triggers y condiciones",               "duration": "20:00"},
                    {"title": "Casos de uso prácticos",               "duration": "30:00"},
                ],
                "quiz": [
                    {"text": "¿Qué es un trigger en automatización?",
                     "options": ["Una acción final", "El evento que inicia la automatización", "Un tipo de reporte", "Una integración"],
                     "correct_answer": 1},
                    {"text": "Las automatizaciones en Maily pueden tener condiciones múltiples.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "Relaciona el tipo de automatización con su caso de uso",
                     "question_type": "matching",
                     "options": [],
                     "correct_answer": None,
                     "config": {"pairs": [
                         {"id": 1, "left": "Recordatorio automático", "right": "Notificar al usuario antes de una fecha"},
                         {"id": 2, "left": "Reporte programado",      "right": "Enviar informe en horario definido"},
                         {"id": 3, "left": "Alerta de umbral",        "right": "Avisar cuando un valor supera el límite"},
                     ]}},
                ],
            },
            {
                "title": "Módulo 2: Integraciones",
                "description": "Conecta Maily con otras herramientas de tu ecosistema.",
                "lessons": [
                    {"title": "Visión general de integraciones",      "duration": "12:00"},
                    {"title": "Integración con Excel y Google Sheets", "duration": "18:00"},
                    {"title": "APIs y webhooks",                      "duration": "25:00"},
                    {"title": "Casos de integración empresarial",     "duration": "22:00"},
                ],
                "quiz": [
                    {"text": "¿Qué es un webhook?",
                     "options": ["Un tipo de reporte", "Una notificación automática HTTP a sistemas externos", "Un formato de archivo", "Una herramienta de diseño"],
                     "correct_answer": 1},
                    {"text": "¿Qué protocolo usa la API de Maily?",
                     "options": ["SOAP", "GraphQL", "REST", "gRPC"],
                     "correct_answer": 2},
                    {"text": "Completa: La integración con {{1}} permite sincronizar hojas de cálculo en tiempo real.",
                     "question_type": "fill_blank",
                     "options": [],
                     "correct_answer": None,
                     "config": {
                         "text": "La integración con {{1}} permite sincronizar hojas de cálculo en tiempo real.",
                         "blanks": [
                             {"id": 1, "hint": "plataforma de Google", "correct_answers": ["Google Sheets", "google sheets", "Sheets"]},
                         ],
                     }},
                ],
            },
            {
                "title": "Módulo 3: Análisis Avanzado",
                "description": "Dashboards personalizados y métricas para la toma de decisiones.",
                "lessons": [
                    {"title": "Creación de dashboards",           "duration": "28:00"},
                    {"title": "KPIs y métricas personalizadas",   "duration": "22:00"},
                    {"title": "Filtros y segmentación avanzada",  "duration": "18:00"},
                    {"title": "Mejores prácticas de análisis",    "duration": "20:00"},
                ],
                "quiz": [
                    {"text": "¿Qué significa KPI?",
                     "options": ["Key Personal Information", "Key Performance Indicator", "Knowledge Process Integration", "Key Process Index"],
                     "correct_answer": 1},
                    {"text": "Un dashboard puede mostrar datos en tiempo real.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Cuál es la mejor práctica para dashboards?",
                     "options": ["Incluir todos los datos posibles", "Enfocarse en las métricas más relevantes", "Usar solo gráficas de barras", "Actualizar manualmente los datos"],
                     "correct_answer": 1},
                ],
            },
        ],
    },
    {
        "title": "Maily para Clínicas Dentales",
        "description": "Aprende a adaptar Maily a la gestión de clínicas odontológicas: expedientes, citas, facturación y reportes especializados.",
        "thumbnail": THUMB["maily"],
        "instructor_email": "sofia.mendez@maily.com",
        "duration": "3 horas",
        "level": "intermediate",
        "rating": "4.7",
        "price": "0.00",
        "section_slug": "maily-academia",
        "modules": [
            {
                "title": "Módulo 1: Expedientes de Pacientes",
                "description": "Gestiona expedientes clínicos de manera digital y eficiente.",
                "lessons": [
                    {"title": "Creación de expedientes digitales",     "duration": "20:00"},
                    {"title": "Historial clínico en Maily",            "duration": "18:00"},
                    {"title": "Adjuntar radiografías e imágenes",      "duration": "15:00"},
                ],
                "quiz": [
                    {"text": "¿Cuántos expedientes puede manejar Maily simultáneamente?",
                     "options": ["Hasta 500", "Hasta 2,000", "Sin límite definido", "Depende del plan contratado"],
                     "correct_answer": 3},
                    {"text": "Relaciona el módulo de Maily con su función en la clínica dental",
                     "question_type": "matching",
                     "options": [],
                     "correct_answer": None,
                     "config": {"pairs": [
                         {"id": 1, "left": "Expedientes",     "right": "Registro del historial clínico del paciente"},
                         {"id": 2, "left": "Agenda",          "right": "Programación y confirmación de citas"},
                         {"id": 3, "left": "Facturación",     "right": "Generación de comprobantes fiscales"},
                     ]}},
                    {"text": "Maily permite adjuntar imágenes y radiografías al expediente del paciente.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                ],
            },
            {
                "title": "Módulo 2: Gestión de Citas",
                "description": "Optimiza la agenda de la clínica y reduce cancelaciones.",
                "lessons": [
                    {"title": "Configuración de la agenda",            "duration": "16:00"},
                    {"title": "Recordatorios automáticos a pacientes", "duration": "12:00"},
                    {"title": "Manejo de cancelaciones",               "duration": "10:00"},
                ],
                "quiz": [
                    {"text": "¿Maily puede enviar recordatorios automáticos a pacientes?",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Por qué canal se envían los recordatorios de cita?",
                     "options": ["Solo email", "Solo SMS", "Email y SMS", "Email, SMS y WhatsApp"],
                     "correct_answer": 2},
                    {"text": "Completa: La agenda de Maily permite ver disponibilidad por {{1}} o por {{2}}.",
                     "question_type": "fill_blank",
                     "options": [],
                     "correct_answer": None,
                     "config": {
                         "text": "La agenda de Maily permite ver disponibilidad por {{1}} o por {{2}}.",
                         "blanks": [
                             {"id": 1, "hint": "período de tiempo", "correct_answers": ["día", "Día"]},
                             {"id": 2, "hint": "otro período",      "correct_answers": ["semana", "Semana", "mes", "Mes"]},
                         ],
                     }},
                ],
            },
            {
                "title": "Módulo 3: Reportes Clínicos",
                "description": "Genera indicadores de productividad y análisis de la clínica.",
                "lessons": [
                    {"title": "Reporte de pacientes activos",          "duration": "14:00"},
                    {"title": "Indicadores de productividad",          "duration": "18:00"},
                    {"title": "Exportación para auditorías",           "duration": "12:00"},
                ],
                "quiz": [
                    {"text": "¿En qué formato se generan los reportes para auditorías?",
                     "options": ["Solo Word", "PDF y Excel", "Solo HTML", "Solo CSV"],
                     "correct_answer": 1},
                    {"text": "¿Se pueden programar reportes semanales automáticos?",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Qué indicador mide el número de citas completadas vs canceladas?",
                     "options": ["Tasa de absentismo", "Productividad operativa", "Tasa de conversión", "Índice de retención"],
                     "correct_answer": 0},
                ],
            },
        ],
    },
    {
        "title": "Certificación Maily Expert",
        "description": "Prepárate para obtener la certificación oficial de Maily Expert. Cubre todos los módulos avanzados, casos de uso empresariales y las mejores prácticas de implementación.",
        "thumbnail": THUMB["maily"],
        "instructor_email": "maria.garcia@maily.com",
        "duration": "8 horas",
        "level": "advanced",
        "rating": "4.9",
        "price": "0.00",
        "section_slug": "maily-academia",
        "modules": [
            {
                "title": "Módulo 1: Arquitectura y Configuración Avanzada",
                "description": "Comprende la estructura interna y las opciones avanzadas de configuración.",
                "lessons": [
                    {"title": "Arquitectura del sistema Maily",        "duration": "22:00"},
                    {"title": "Configuración multi-usuario",           "duration": "28:00"},
                    {"title": "Seguridad y control de accesos",        "duration": "20:00"},
                    {"title": "Respaldos y recuperación de datos",     "duration": "18:00"},
                ],
                "quiz": [
                    {"text": "¿Qué componente maneja la autenticación en Maily Enterprise?",
                     "options": ["Módulo de Reportes", "Módulo de Seguridad", "Gateway de API", "Servidor de Caché"],
                     "correct_answer": 1},
                    {"text": "Relaciona el nivel de acceso con sus permisos en Maily",
                     "question_type": "matching",
                     "options": [],
                     "correct_answer": None,
                     "config": {"pairs": [
                         {"id": 1, "left": "Administrador", "right": "Acceso total al sistema"},
                         {"id": 2, "left": "Supervisor",    "right": "Acceso a reportes y lectura de datos"},
                         {"id": 3, "left": "Operador",      "right": "Captura y edición de registros propios"},
                     ]}},
                    {"text": "Los respaldos automáticos en Maily se configuran desde el panel de administración.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                ],
            },
            {
                "title": "Módulo 2: Implementación Empresarial",
                "description": "Estrategias para desplegar Maily en organizaciones medianas y grandes.",
                "lessons": [
                    {"title": "Planificación de la implementación",    "duration": "25:00"},
                    {"title": "Migración de datos existentes",         "duration": "30:00"},
                    {"title": "Capacitación de usuarios finales",      "duration": "20:00"},
                    {"title": "Soporte post-implementación",           "duration": "15:00"},
                ],
                "quiz": [
                    {"text": "¿Cuál es la primera fase de una implementación exitosa de Maily?",
                     "options": ["Migración de datos", "Planificación y levantamiento de requerimientos", "Capacitación de usuarios", "Configuración del servidor"],
                     "correct_answer": 1},
                    {"text": "Completa: La migración de datos en Maily utiliza plantillas en formato {{1}} para garantizar la integridad.",
                     "question_type": "fill_blank",
                     "options": [],
                     "correct_answer": None,
                     "config": {
                         "text": "La migración de datos en Maily utiliza plantillas en formato {{1}} para garantizar la integridad.",
                         "blanks": [
                             {"id": 1, "hint": "formato de hoja de cálculo", "correct_answers": ["Excel", "excel", "XLSX", "xlsx", "CSV", "csv"]},
                         ],
                     }},
                    {"text": "¿Se puede migrar Maily a otro servidor sin pérdida de datos?",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                ],
            },
            {
                "title": "Módulo 3: Examen de Certificación",
                "description": "Repaso integral y simulacro del examen oficial de Maily Expert.",
                "lessons": [
                    {"title": "Repaso de todos los módulos",            "duration": "45:00"},
                    {"title": "Simulacro de examen práctico",           "duration": "60:00"},
                    {"title": "Resolución de casos empresariales",      "duration": "40:00"},
                ],
                "quiz": [
                    {"text": "¿Cuántos intentos se permiten en el examen oficial de Maily Expert?",
                     "options": ["1 intento", "2 intentos", "3 intentos", "Ilimitados"],
                     "correct_answer": 1},
                    {"text": "Completa: La calificación mínima para obtener la certificación Maily Expert es {{1}}%.",
                     "question_type": "fill_blank",
                     "options": [],
                     "correct_answer": None,
                     "config": {
                         "text": "La calificación mínima para obtener la certificación Maily Expert es {{1}}%.",
                         "blanks": [
                             {"id": 1, "hint": "porcentaje", "correct_answers": ["80", "80%"]},
                         ],
                     }},
                    {"text": "La certificación Maily Expert tiene vigencia de 2 años.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                ],
            },
        ],
    },
]


# ── Helper: generar módulos genéricos para cursos de salud ───────────────────
def health_modules(m1_title, m2_title, m3_title, topic, q1_extra=None):
    """Genera 3 módulos estándar para un curso de salud."""
    def tf(text, correct):
        return {"text": text, "question_type": "true_false", "options": ["Verdadero", "Falso"], "correct_answer": correct}

    def mc(text, options, correct):
        return {"text": text, "options": options, "correct_answer": correct}

    return [
        {
            "title": m1_title,
            "description": f"Fundamentos teóricos y conceptos esenciales de {topic}.",
            "lessons": [
                {"title": f"Introducción a {topic}",              "duration": "12:00"},
                {"title": f"Principios básicos de {topic}",       "duration": "18:00"},
                {"title": f"Historia y evolución de {topic}",     "duration": "14:00"},
            ],
            "quiz": [
                mc(f"¿Cuál es el objetivo principal de {topic}?",
                   ["Diagnóstico temprano", "Prevención y tratamiento", "Administración de recursos", "Investigación básica"],
                   1),
                tf(f"La práctica de {topic} requiere actualización constante.", 0),
                q1_extra or mc(
                    "¿Qué habilidad es fundamental en este campo?",
                    ["Comunicación con el paciente", "Gestión financiera", "Marketing digital", "Programación web"],
                    0,
                ),
            ],
        },
        {
            "title": m2_title,
            "description": f"Aplicación clínica y casos prácticos de {topic}.",
            "lessons": [
                {"title": f"Aplicación clínica de {topic}",       "duration": "20:00"},
                {"title": f"Casos clínicos frecuentes",           "duration": "25:00"},
                {"title": f"Errores comunes y cómo evitarlos",    "duration": "16:00"},
            ],
            "quiz": [
                mc("¿Qué documento respalda las decisiones clínicas?",
                   ["Nota de evolución", "Factura", "Correo electrónico", "Nota de venta"],
                   0),
                tf("El trabajo en equipo multidisciplinario mejora los resultados del paciente.", 0),
                mc("¿Con qué frecuencia deben actualizarse los protocolos clínicos?",
                   ["Cada 10 años", "Cada 5 años", "Según evidencia científica disponible", "Nunca, son permanentes"],
                   2),
            ],
        },
        {
            "title": m3_title,
            "description": f"Evaluación, indicadores de calidad y tendencias futuras en {topic}.",
            "lessons": [
                {"title": f"Indicadores de calidad en {topic}",   "duration": "18:00"},
                {"title": f"Tecnología aplicada a {topic}",       "duration": "22:00"},
                {"title": "Tendencias y futuro del área",         "duration": "15:00"},
            ],
            "quiz": [
                mc("¿Qué indicador mide la efectividad de una intervención de salud?",
                   ["Número de empleados", "Tasa de éxito del tratamiento", "Ingresos generados", "Área del consultorio"],
                   1),
                tf("La telemedicina es una tendencia consolidada en la práctica de salud actual.", 0),
                mc("¿Cuál es el principal reto del sector salud en México?",
                   ["Falta de tecnología", "Acceso equitativo y cobertura universal", "Exceso de médicos", "Falta de pacientes"],
                   1),
            ],
        },
    ]


# ── Longevity 360 courses (20 cursos, 2 por categoría) ───────────────────────
_lon_instructors = [
    "dr.ramirez@longevity360.com",
    "lic.torres@longevity360.com",
    "nutriologa.villa@longevity360.com",
]
_li = 0  # rotación de instructores


def _next_lon_instructor():
    global _li
    instr = _lon_instructors[_li % len(_lon_instructors)]
    _li += 1
    return instr


LONGEVITY_COURSES = [
    # ── medicina-general ──
    {
        "title": "Introducción a la Medicina General",
        "description": "Conceptos esenciales de la práctica médica general para profesionales y estudiantes de la salud. Cubre historia clínica, semiología básica y atención primaria.",
        "thumbnail": THUMB["medicina-general"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.6", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "medicina-general",
        "modules": health_modules("Módulo 1: Fundamentos de Medicina General",
                                  "Módulo 2: Historia Clínica y Semiología",
                                  "Módulo 3: Atención Primaria", "la medicina general"),
    },
    {
        "title": "Diagnóstico Clínico Avanzado",
        "description": "Profundiza en técnicas de diagnóstico diferencial, interpretación de estudios de laboratorio e imagen, y razonamiento clínico avanzado.",
        "thumbnail": THUMB["medicina-general"], "instructor_email": _next_lon_instructor(),
        "duration": "6 horas", "level": "advanced", "rating": "4.8", "price": "349.00",
        "section_slug": "longevity-360", "category_slug": "medicina-general",
        "modules": health_modules("Módulo 1: Razonamiento Diagnóstico",
                                  "Módulo 2: Laboratorio e Imagen",
                                  "Módulo 3: Diagnóstico Diferencial", "el diagnóstico clínico"),
    },
    # ── enfermeria ──
    {
        "title": "Fundamentos de Enfermería",
        "description": "Bases teóricas y prácticas de la enfermería moderna: proceso de atención de enfermería (PAE), seguridad del paciente y registros clínicos.",
        "thumbnail": THUMB["enfermeria"], "instructor_email": _next_lon_instructor(),
        "duration": "4 horas", "level": "beginner", "rating": "4.7", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "enfermeria",
        "modules": health_modules("Módulo 1: Proceso de Atención de Enfermería",
                                  "Módulo 2: Técnicas y Procedimientos Básicos",
                                  "Módulo 3: Seguridad del Paciente", "la enfermería"),
    },
    {
        "title": "Cuidados Intensivos y UCI",
        "description": "Manejo avanzado del paciente crítico en Unidad de Cuidados Intensivos. Monitoreo hemodinámico, ventilación mecánica y protocolos de emergencia.",
        "thumbnail": THUMB["enfermeria"], "instructor_email": _next_lon_instructor(),
        "duration": "7 horas", "level": "advanced", "rating": "4.9", "price": "299.00",
        "section_slug": "longevity-360", "category_slug": "enfermeria",
        "modules": health_modules("Módulo 1: El Paciente Crítico",
                                  "Módulo 2: Monitoreo y Ventilación Mecánica",
                                  "Módulo 3: Protocolos de Emergencia", "los cuidados intensivos"),
    },
    # ── odontologia ──
    {
        "title": "Salud Bucal Preventiva",
        "description": "Estrategias de prevención odontológica, higiene oral correcta, fluorización y selladores. Ideal para profesionales de atención primaria.",
        "thumbnail": THUMB["odontologia"], "instructor_email": _next_lon_instructor(),
        "duration": "2.5 horas", "level": "beginner", "rating": "4.5", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "odontologia",
        "modules": health_modules("Módulo 1: Prevención Odontológica",
                                  "Módulo 2: Higiene Oral y Flúor",
                                  "Módulo 3: Selladores y Profilaxis", "la odontología preventiva"),
    },
    {
        "title": "Odontología Restauradora",
        "description": "Técnicas de restauración con composite, amalgama e incrustaciones. Gestión del dolor y anestesia local en el consultorio dental.",
        "thumbnail": THUMB["odontologia"], "instructor_email": _next_lon_instructor(),
        "duration": "6 horas", "level": "intermediate", "rating": "4.8", "price": "399.00",
        "section_slug": "longevity-360", "category_slug": "odontologia",
        "modules": health_modules("Módulo 1: Materiales Dentales de Restauración",
                                  "Módulo 2: Técnicas de Obturación",
                                  "Módulo 3: Anestesia y Manejo del Dolor", "la odontología restauradora"),
    },
    # ── nutricion ──
    {
        "title": "Nutrición Básica y Alimentación Saludable",
        "description": "Principios fundamentales de la nutrición humana, macronutrientes, micronutrientes y guías dietéticas para la población general.",
        "thumbnail": THUMB["nutricion"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.7", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "nutricion",
        "modules": health_modules("Módulo 1: Macronutrientes",
                                  "Módulo 2: Micronutrientes y Agua",
                                  "Módulo 3: Dieta Equilibrada y Guías Alimentarias", "la nutrición básica"),
    },
    {
        "title": "Nutrición Clínica Especializada",
        "description": "Soporte nutricional para pacientes hospitalizados, nutrición enteral y parenteral, y manejo nutricional de enfermedades crónicas.",
        "thumbnail": THUMB["nutricion"], "instructor_email": _next_lon_instructor(),
        "duration": "5 horas", "level": "advanced", "rating": "4.8", "price": "349.00",
        "section_slug": "longevity-360", "category_slug": "nutricion",
        "modules": health_modules("Módulo 1: Evaluación Nutricional Clínica",
                                  "Módulo 2: Nutrición Enteral y Parenteral",
                                  "Módulo 3: Nutrición en Enfermedades Crónicas", "la nutrición clínica"),
    },
    # ── psicologia ──
    {
        "title": "Salud Mental y Bienestar Emocional",
        "description": "Herramientas prácticas para la gestión del estrés, la ansiedad y el bienestar emocional. Psicología positiva aplicada al contexto de salud.",
        "thumbnail": THUMB["psicologia"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.8", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "psicologia",
        "modules": health_modules("Módulo 1: Fundamentos de Salud Mental",
                                  "Módulo 2: Manejo del Estrés y la Ansiedad",
                                  "Módulo 3: Psicología Positiva y Resiliencia", "la salud mental"),
    },
    {
        "title": "Psicología Clínica Aplicada",
        "description": "Evaluación psicológica, técnicas de intervención cognitivo-conductual y manejo de trastornos del estado de ánimo en el contexto clínico.",
        "thumbnail": THUMB["psicologia"], "instructor_email": _next_lon_instructor(),
        "duration": "6 horas", "level": "intermediate", "rating": "4.7", "price": "299.00",
        "section_slug": "longevity-360", "category_slug": "psicologia",
        "modules": health_modules("Módulo 1: Evaluación Psicológica",
                                  "Módulo 2: Terapia Cognitivo-Conductual",
                                  "Módulo 3: Trastornos del Estado de Ánimo", "la psicología clínica"),
    },
    # ── fisioterapia ──
    {
        "title": "Ejercicio y Movilidad para la Salud",
        "description": "Prescripción de actividad física, ejercicio terapéutico y programas de movilidad para mejorar la calidad de vida en población general.",
        "thumbnail": THUMB["fisioterapia"], "instructor_email": _next_lon_instructor(),
        "duration": "2.5 horas", "level": "beginner", "rating": "4.6", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "fisioterapia",
        "modules": health_modules("Módulo 1: Fisiología del Ejercicio",
                                  "Módulo 2: Prescripción de Actividad Física",
                                  "Módulo 3: Programas de Movilidad y Flexibilidad", "la fisioterapia y el ejercicio"),
    },
    {
        "title": "Fisioterapia Neurológica",
        "description": "Rehabilitación de pacientes con afecciones neurológicas: ACV, Parkinson, esclerosis múltiple. Técnicas de Bobath, PNF y neuromodulación.",
        "thumbnail": THUMB["fisioterapia"], "instructor_email": _next_lon_instructor(),
        "duration": "7 horas", "level": "advanced", "rating": "4.9", "price": "399.00",
        "section_slug": "longevity-360", "category_slug": "fisioterapia",
        "modules": health_modules("Módulo 1: Bases Neurológicas de la Rehabilitación",
                                  "Módulo 2: Técnicas Especializadas (Bobath y PNF)",
                                  "Módulo 3: Rehabilitación en ACV y Parkinson", "la fisioterapia neurológica"),
    },
    # ── farmacologia ──
    {
        "title": "Medicamentos de Uso Común",
        "description": "Farmacología esencial para el profesional de salud: grupos farmacológicos más usados, mecanismos de acción, indicaciones y efectos adversos.",
        "thumbnail": THUMB["farmacologia"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.5", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "farmacologia",
        "modules": health_modules("Módulo 1: Farmacocinética y Farmacodinámica Básica",
                                  "Módulo 2: Analgésicos, Antibióticos y Antiinflamatorios",
                                  "Módulo 3: Interacciones y Efectos Adversos", "la farmacología básica"),
    },
    {
        "title": "Farmacología Clínica Avanzada",
        "description": "Farmacoterapia de enfermedades crónicas: diabetes, hipertensión, dislipidemias. Polifarmacia en el adulto mayor y adherencia terapéutica.",
        "thumbnail": THUMB["farmacologia"], "instructor_email": _next_lon_instructor(),
        "duration": "6 horas", "level": "advanced", "rating": "4.8", "price": "349.00",
        "section_slug": "longevity-360", "category_slug": "farmacologia",
        "modules": health_modules("Módulo 1: Farmacoterapia de Enfermedades Crónicas",
                                  "Módulo 2: Polifarmacia y Adulto Mayor",
                                  "Módulo 3: Adherencia Terapéutica", "la farmacología clínica avanzada"),
    },
    # ── tecnologia-medica ──
    {
        "title": "Tecnología en la Práctica Médica",
        "description": "Panorama de las herramientas tecnológicas en salud: expediente clínico electrónico, telemedicina, wearables y apps de salud.",
        "thumbnail": THUMB["tecnologia-medica"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.7", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "tecnologia-medica",
        "modules": health_modules("Módulo 1: Expediente Clínico Electrónico",
                                  "Módulo 2: Telemedicina y Salud Digital",
                                  "Módulo 3: Wearables y Apps de Salud", "la tecnología médica"),
    },
    {
        "title": "Sistemas de Información en Salud",
        "description": "Implementación y gestión de sistemas de información hospitalaria (HIS), interoperabilidad HL7/FHIR, seguridad de datos clínicos y Big Data en salud.",
        "thumbnail": THUMB["tecnologia-medica"], "instructor_email": _next_lon_instructor(),
        "duration": "5 horas", "level": "intermediate", "rating": "4.6", "price": "449.00",
        "section_slug": "longevity-360", "category_slug": "tecnologia-medica",
        "modules": health_modules("Módulo 1: Sistemas HIS y Arquitectura",
                                  "Módulo 2: Interoperabilidad y Estándares HL7",
                                  "Módulo 3: Big Data y Seguridad de Datos Clínicos", "los sistemas de información en salud"),
    },
    # ── salud-publica ──
    {
        "title": "Epidemiología y Prevención Básica",
        "description": "Conceptos fundamentales de epidemiología descriptiva y analítica, indicadores de salud pública y estrategias de prevención primaria y secundaria.",
        "thumbnail": THUMB["salud-publica"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.5", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "salud-publica",
        "modules": health_modules("Módulo 1: Indicadores Epidemiológicos",
                                  "Módulo 2: Vigilancia Epidemiológica",
                                  "Módulo 3: Estrategias de Prevención", "la epidemiología"),
    },
    {
        "title": "Gestión de Programas de Salud Pública",
        "description": "Diseño, implementación y evaluación de programas de salud pública a nivel comunitario e institucional. Financiamiento y políticas en salud.",
        "thumbnail": THUMB["salud-publica"], "instructor_email": _next_lon_instructor(),
        "duration": "5 horas", "level": "intermediate", "rating": "4.7", "price": "299.00",
        "section_slug": "longevity-360", "category_slug": "salud-publica",
        "modules": health_modules("Módulo 1: Diseño de Programas de Salud",
                                  "Módulo 2: Implementación y Financiamiento",
                                  "Módulo 3: Evaluación de Impacto", "la gestión de programas de salud"),
    },
    # ── administracion-hospitalaria ──
    {
        "title": "Gestión Básica de Clínicas",
        "description": "Principios de administración para pequeñas y medianas clínicas: recursos humanos, finanzas básicas, normatividad y calidad en la atención.",
        "thumbnail": THUMB["administracion-hospitalaria"], "instructor_email": _next_lon_instructor(),
        "duration": "3 horas", "level": "beginner", "rating": "4.6", "price": "0.00",
        "section_slug": "longevity-360", "category_slug": "administracion-hospitalaria",
        "modules": health_modules("Módulo 1: Organización y Recursos Humanos",
                                  "Módulo 2: Finanzas y Presupuesto Básico",
                                  "Módulo 3: Normatividad y Calidad", "la gestión de clínicas"),
    },
    {
        "title": "Administración Hospitalaria Avanzada",
        "description": "Gestión estratégica de hospitales: acreditación, gestión de riesgos, indicadores de calidad hospitalaria, optimización de procesos y liderazgo clínico.",
        "thumbnail": THUMB["administracion-hospitalaria"], "instructor_email": _next_lon_instructor(),
        "duration": "7 horas", "level": "advanced", "rating": "4.9", "price": "499.00",
        "section_slug": "longevity-360", "category_slug": "administracion-hospitalaria",
        "modules": health_modules("Módulo 1: Acreditación y Certificación Hospitalaria",
                                  "Módulo 2: Gestión de Riesgos Clínicos",
                                  "Módulo 3: Liderazgo y Estrategia Hospitalaria", "la administración hospitalaria avanzada"),
    },
]


# ── Corporativo CAMSA courses ─────────────────────────────────────────────────
CORPORATIVO_COURSES = [
    {
        "title": "Onboarding CAMSA 2025",
        "description": "Bienvenida oficial para nuevos colaboradores del corporativo CAMSA. Conoce la historia, valores, estructura organizacional y beneficios de la empresa.",
        "thumbnail": THUMB["corporativo"], "instructor_email": "rrhh.camsa@corporativo.com",
        "duration": "2 horas", "level": "beginner", "rating": "4.5", "price": "0.00",
        "section_slug": "corporativo-camsa",
        "modules": [
            {
                "title": "Módulo 1: Historia y Cultura CAMSA",
                "description": "Conoce la trayectoria y los valores que nos definen.",
                "lessons": [
                    {"title": "Historia de CAMSA",                    "duration": "09:00"},
                    {"title": "Misión, Visión y Valores",             "duration": "07:30"},
                    {"title": "Estructura organizacional",            "duration": "10:00"},
                ],
                "quiz": [
                    {"text": "¿En qué año fue fundado el corporativo CAMSA?",
                     "options": ["1990", "1995", "2000", "2005"],
                     "correct_answer": 1},
                    {"text": "CAMSA tiene presencia en más de 5 estados de la República Mexicana.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Cuál es el principal valor de CAMSA?",
                     "options": ["Rentabilidad", "Calidad y bienestar del paciente", "Expansión rápida", "Tecnología"],
                     "correct_answer": 1},
                ],
            },
            {
                "title": "Módulo 2: Beneficios y Políticas",
                "description": "Todo lo que necesitas saber sobre tus prestaciones y normas internas.",
                "lessons": [
                    {"title": "Prestaciones y beneficios",            "duration": "12:00"},
                    {"title": "Código de conducta",                   "duration": "10:00"},
                    {"title": "Herramientas de trabajo",              "duration": "08:00"},
                ],
                "quiz": [
                    {"text": "¿Cuántos días de vacaciones corresponden en el primer año?",
                     "options": ["6 días", "8 días", "12 días", "15 días"],
                     "correct_answer": 2},
                    {"text": "El código de conducta de CAMSA aplica solo durante el horario laboral.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                    {"text": "¿A quién se reporta un conflicto de interés?",
                     "options": ["Al cliente", "Al área de RRHH o Compliance", "A un compañero de trabajo", "A la dirección médica"],
                     "correct_answer": 1},
                ],
            },
            {
                "title": "Módulo 3: Primeros Pasos en CAMSA",
                "description": "Guía práctica para integrarte rápidamente al equipo.",
                "lessons": [
                    {"title": "Tu primer día: qué esperar",           "duration": "08:00"},
                    {"title": "Sistemas internos de CAMSA",           "duration": "15:00"},
                    {"title": "Recursos y canales de comunicación",   "duration": "10:00"},
                ],
                "quiz": [
                    {"text": "Relaciona cada plataforma interna con su función",
                     "question_type": "matching",
                     "options": [],
                     "correct_answer": None,
                     "config": {"pairs": [
                         {"id": 1, "left": "Intranet CAMSA",  "right": "Portal de comunicados y documentos"},
                         {"id": 2, "left": "Sistema Maily",   "right": "Gestión de expedientes y reportes"},
                         {"id": 3, "left": "RRHH Online",     "right": "Solicitudes de vacaciones y nómina"},
                     ]}},
                    {"text": "¿Cuál es el canal oficial para reportar incidencias de seguridad?",
                     "options": ["WhatsApp personal", "Correo a seguridad@camsa.mx", "Llamada al director general", "Redes sociales"],
                     "correct_answer": 1},
                    {"text": "Durante el periodo de inducción, el nuevo colaborador tiene un mentor asignado.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                ],
            },
        ],
    },
    {
        "title": "Higiene y Bioseguridad Clínica",
        "description": "Protocolos de higiene, bioseguridad y prevención de infecciones para el personal de CAMSA. Cumple con la NOM-045-SSA2 y estándares internacionales.",
        "thumbnail": THUMB["corporativo"], "instructor_email": "seguridad.camsa@corporativo.com",
        "duration": "3 horas", "level": "beginner", "rating": "4.7", "price": "0.00",
        "section_slug": "corporativo-camsa",
        "modules": [
            {
                "title": "Módulo 1: Bioseguridad y EPP",
                "description": "Uso correcto del equipo de protección personal.",
                "lessons": [
                    {"title": "Lavado de manos clínico",              "duration": "08:30"},
                    {"title": "Uso de EPP: mascarillas y guantes",    "duration": "10:15"},
                    {"title": "Manejo de residuos peligrosos",        "duration": "12:00"},
                ],
                "quiz": [
                    {"text": "¿Cuántos pasos tiene la técnica correcta de lavado de manos clínico?",
                     "options": ["3 pasos", "5 pasos", "7 pasos", "10 pasos"],
                     "correct_answer": 1},
                    {"text": "Los guantes sustituyen el lavado de manos en procedimientos de bajo riesgo.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                    {"text": "¿Qué color de bolsa corresponde a los residuos biológico-infecciosos?",
                     "options": ["Verde", "Gris", "Rojo", "Amarillo"],
                     "correct_answer": 2},
                ],
            },
            {
                "title": "Módulo 2: Prevención de Infecciones",
                "description": "Estrategias para prevenir infecciones asociadas a la atención de salud.",
                "lessons": [
                    {"title": "Infecciones nosocomiales: concepto",   "duration": "14:00"},
                    {"title": "Precauciones estándar",                "duration": "16:00"},
                    {"title": "Protocolo ante accidente con material biológico", "duration": "12:00"},
                ],
                "quiz": [
                    {"text": "¿Qué son las infecciones nosocomiales?",
                     "options": ["Infecciones adquiridas en el hogar", "Infecciones adquiridas durante la atención de salud", "Infecciones crónicas", "Infecciones virales únicamente"],
                     "correct_answer": 1},
                    {"text": "Ante un pinchazo accidental, el primer paso es lavar la herida con agua y jabón.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Cuánto tiempo deben durar las precauciones de aislamiento de contacto?",
                     "options": ["24 horas", "48 horas", "Hasta resolución del cuadro clínico", "Permanentemente"],
                     "correct_answer": 2},
                ],
            },
            {
                "title": "Módulo 3: Normatividad Aplicada",
                "description": "Marco legal y normativo de bioseguridad en México.",
                "lessons": [
                    {"title": "NOM-045-SSA2 y RPBI",                 "duration": "18:00"},
                    {"title": "Comité de control de infecciones",     "duration": "12:00"},
                    {"title": "Auditoría e indicadores de bioseguridad", "duration": "14:00"},
                ],
                "quiz": [
                    {"text": "¿Qué regula la NOM-045-SSA2?",
                     "options": ["Residuos sólidos urbanos", "Para la vigilancia epidemiológica, prevención y control de las infecciones nosocomiales", "Manejo de alimentos", "Seguridad industrial"],
                     "correct_answer": 1},
                    {"text": "El Comité de Control de Infecciones debe reunirse al menos una vez al mes.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Cuál es el indicador más importante de un programa de bioseguridad?",
                     "options": ["Número de capacitaciones", "Tasa de infecciones nosocomiales", "Presupuesto asignado", "Cantidad de EPP comprado"],
                     "correct_answer": 1},
                ],
            },
        ],
    },
    {
        "title": "Liderazgo y Gestión de Equipos",
        "description": "Desarrolla competencias de liderazgo para coordinar equipos de salud de alto rendimiento en el contexto de CAMSA. Comunicación efectiva, manejo de conflictos y delegación.",
        "thumbnail": THUMB["corporativo"], "instructor_email": "capacitacion.camsa@corporativo.com",
        "duration": "4 horas", "level": "intermediate", "rating": "4.8", "price": "0.00",
        "section_slug": "corporativo-camsa",
        "modules": [
            {
                "title": "Módulo 1: Fundamentos de Liderazgo",
                "description": "Estilos de liderazgo y su impacto en el equipo.",
                "lessons": [
                    {"title": "Estilos de liderazgo",                 "duration": "18:00"},
                    {"title": "Inteligencia emocional en el líder",   "duration": "20:00"},
                    {"title": "Comunicación asertiva",                "duration": "16:00"},
                ],
                "quiz": [
                    {"text": "¿Cuál es el estilo de liderazgo más efectivo en contextos de alta presión?",
                     "options": ["Autocrático", "Laissez-faire", "Situacional", "Burocrático"],
                     "correct_answer": 2},
                    {"text": "La inteligencia emocional es una habilidad innata que no se puede desarrollar.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                    {"text": "¿Qué técnica facilita la comunicación clara de expectativas?",
                     "options": ["Método SMART", "Método FIFO", "Técnica Kaizen", "Diagrama de Gantt"],
                     "correct_answer": 0},
                ],
            },
            {
                "title": "Módulo 2: Gestión de Equipos de Alto Rendimiento",
                "description": "Herramientas para construir y mantener equipos efectivos.",
                "lessons": [
                    {"title": "Construcción de equipos de salud",     "duration": "22:00"},
                    {"title": "Delegación efectiva",                  "duration": "18:00"},
                    {"title": "Manejo de conflictos",                 "duration": "20:00"},
                ],
                "quiz": [
                    {"text": "Relaciona el rol con su responsabilidad en el equipo",
                     "question_type": "matching",
                     "options": [],
                     "correct_answer": None,
                     "config": {"pairs": [
                         {"id": 1, "left": "Líder",       "right": "Define la dirección y motiva al equipo"},
                         {"id": 2, "left": "Coordinador", "right": "Organiza tareas y recursos"},
                         {"id": 3, "left": "Ejecutor",    "right": "Implementa las acciones definidas"},
                     ]}},
                    {"text": "La delegación efectiva implica ceder responsabilidad sin rendir cuentas.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                    {"text": "¿Cuál es el primer paso en la resolución de conflictos?",
                     "options": ["Escalar al director", "Identificar la causa raíz", "Ignorar el conflicto", "Sancionar a las partes"],
                     "correct_answer": 1},
                ],
            },
            {
                "title": "Módulo 3: Retroalimentación y Mejora Continua",
                "description": "Cultura de feedback y herramientas para la mejora continua.",
                "lessons": [
                    {"title": "Retroalimentación constructiva",       "duration": "16:00"},
                    {"title": "Evaluación de desempeño en CAMSA",     "duration": "14:00"},
                    {"title": "Plan de desarrollo individual",        "duration": "18:00"},
                ],
                "quiz": [
                    {"text": "¿Cuándo debe darse la retroalimentación?",
                     "options": ["Solo en evaluaciones anuales", "Solo cuando hay problemas", "De forma continua y oportuna", "Solo a petición del empleado"],
                     "correct_answer": 2},
                    {"text": "El feedback positivo debe ser tan específico como el negativo.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Qué significa PDI en CAMSA?",
                     "options": ["Plan de Descuentos Individuales", "Plan de Desarrollo Individual", "Programa de Desempeño Integral", "Política de Datos Internos"],
                     "correct_answer": 1},
                ],
            },
        ],
    },
    {
        "title": "Normativa y Cumplimiento Legal",
        "description": "Marco legal aplicable al sector salud en México: COFEPRIS, Ley General de Salud, protección de datos personales en salud y responsabilidad profesional.",
        "thumbnail": THUMB["corporativo"], "instructor_email": "capacitacion.camsa@corporativo.com",
        "duration": "3.5 horas", "level": "intermediate", "rating": "4.6", "price": "0.00",
        "section_slug": "corporativo-camsa",
        "modules": [
            {
                "title": "Módulo 1: Marco Legal del Sector Salud",
                "description": "Leyes y normas que rigen la práctica en México.",
                "lessons": [
                    {"title": "Ley General de Salud",                 "duration": "16:00"},
                    {"title": "Normas Oficiales Mexicanas (NOM)",     "duration": "20:00"},
                    {"title": "COFEPRIS: funciones y alcance",        "duration": "14:00"},
                ],
                "quiz": [
                    {"text": "¿Qué organismo regula los medicamentos y dispositivos médicos en México?",
                     "options": ["IMSS", "ISSSTE", "COFEPRIS", "CONACYT"],
                     "correct_answer": 2},
                    {"text": "Las NOM son de cumplimiento voluntario para las instituciones de salud.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                    {"text": "¿Cuál es la principal ley que regula la salud en México?",
                     "options": ["Ley del Seguro Social", "Ley General de Salud", "Ley Federal del Trabajo", "Ley de Protección al Consumidor"],
                     "correct_answer": 1},
                ],
            },
            {
                "title": "Módulo 2: Protección de Datos en Salud",
                "description": "LFPDPPP y su aplicación en el manejo de expedientes clínicos.",
                "lessons": [
                    {"title": "Ley Federal de Protección de Datos Personales", "duration": "18:00"},
                    {"title": "Datos sensibles en salud",              "duration": "14:00"},
                    {"title": "Aviso de privacidad y consentimiento informado", "duration": "16:00"},
                ],
                "quiz": [
                    {"text": "¿Cuál es la sigla de la ley de privacidad en México?",
                     "options": ["LOPD", "GDPR", "LFPDPPP", "HIPAA"],
                     "correct_answer": 2},
                    {"text": "El expediente clínico electrónico requiere consentimiento del paciente para ser compartido.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 0},
                    {"text": "¿Qué es el consentimiento informado?",
                     "options": ["Una firma de bienvenida", "La autorización del paciente tras recibir información clara sobre un procedimiento", "Un formato de alta hospitalaria", "Un contrato de servicios"],
                     "correct_answer": 1},
                ],
            },
            {
                "title": "Módulo 3: Responsabilidad Profesional",
                "description": "Responsabilidad civil, penal y administrativa en el ejercicio de la salud.",
                "lessons": [
                    {"title": "Responsabilidad médica en México",     "duration": "20:00"},
                    {"title": "Mala praxis y su prevención",          "duration": "18:00"},
                    {"title": "Seguros de responsabilidad profesional", "duration": "12:00"},
                ],
                "quiz": [
                    {"text": "¿Qué tipo de responsabilidad puede derivar de una negligencia médica?",
                     "options": ["Solo civil", "Solo penal", "Solo administrativa", "Civil, penal y administrativa"],
                     "correct_answer": 3},
                    {"text": "Un seguro de responsabilidad profesional es obligatorio en México para todos los médicos.",
                     "question_type": "true_false",
                     "options": ["Verdadero", "Falso"],
                     "correct_answer": 1},
                    {"text": "¿Cuál es la mejor estrategia para prevenir demandas por mala praxis?",
                     "options": ["Evitar procedimientos complejos", "Documentar adecuadamente y obtener consentimiento informado", "Atender solo a pacientes privados", "Trabajar sin asistentes"],
                     "correct_answer": 1},
                ],
            },
        ],
    },
]

# ── All courses combined ──────────────────────────────────────────────────────
ALL_COURSES = MAILY_COURSES + LONGEVITY_COURSES + CORPORATIVO_COURSES


# ── Command ───────────────────────────────────────────────────────────────────
class Command(BaseCommand):
    help = "Seed the database with rich demo data for presentations."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("\n── Limpiando datos anteriores (se preservan admins y superusers) ──"))
        self._flush()

        self.stdout.write(self.style.WARNING("\n── Creando secciones ──"))
        sections = self._create_sections()

        self.stdout.write(self.style.WARNING("\n── Creando categorías ──"))
        categories = self._create_categories(sections)

        self.stdout.write(self.style.WARNING("\n── Creando instructores ──"))
        instructors = self._create_users(INSTRUCTORS, "instructor", sections)

        self.stdout.write(self.style.WARNING("\n── Creando alumnos ──"))
        students = self._create_users(STUDENTS, "student", sections)

        self.stdout.write(self.style.WARNING("\n── Creando cursos, módulos, lecciones y quizzes ──"))
        courses = self._create_courses(sections, categories, instructors)

        self.stdout.write(self.style.WARNING("\n── Generando historial de alumnos ──"))
        self._create_student_history(students, courses, sections)

        self.stdout.write(self.style.SUCCESS("\n✓ Seed completado exitosamente!\n"))
        self._print_summary(instructors, students, courses)

    # ── Flush ─────────────────────────────────────────────────────────────────
    def _flush(self):
        from apps.quizzes.models import FinalEvaluationAttempt, FinalEvaluationRequest, FinalEvaluation
        FinalEvaluationAttempt.objects.all().delete()
        FinalEvaluationRequest.objects.all().delete()
        FinalEvaluation.objects.all().delete()
        UserActivity.objects.all().delete()
        Certificate.objects.all().delete()
        QuizAttempt.objects.all().delete()
        LessonProgress.objects.all().delete()
        Purchase.objects.all().delete()
        Enrollment.objects.all().delete()
        Question.objects.all().delete()
        Quiz.objects.all().delete()
        Lesson.objects.all().delete()
        Module.objects.all().delete()
        Course.objects.all().delete()
        Category.objects.all().delete()
        # Borrar users que NO sean superuser ni admin
        demo_emails = [u["email"] for u in INSTRUCTORS + STUDENTS]
        old_seed_domains = ["@maily.com", "@longevity360.com", "@corporativo.com", "@demo.com"]
        users_to_delete = User.objects.filter(is_superuser=False, is_staff=False).exclude(role="admin")
        # También borrar instructores/alumnos del seed anterior aunque sean @maily.com
        users_to_delete_also = User.objects.filter(
            email__in=demo_emails
        ).exclude(is_superuser=True)
        (users_to_delete | users_to_delete_also).distinct().delete()
        SectionMembership.objects.filter(
            user__is_superuser=False, user__role__in=["student", "instructor"]
        ).delete()
        self.stdout.write("  Datos anteriores eliminados.")

    # ── Sections ──────────────────────────────────────────────────────────────
    def _create_sections(self):
        sections = {}
        for data in SECTIONS_DATA:
            section, created = Section.objects.get_or_create(
                slug=data["slug"],
                defaults={k: v for k, v in data.items() if k != "slug"},
            )
            sections[section.slug] = section
            tag = "creada" if created else "ya existe"
            self.stdout.write(f"  [{tag}] {section.name}")
        return sections

    # ── Categories ────────────────────────────────────────────────────────────
    def _create_categories(self, sections):
        longevity = sections.get("longevity-360")
        categories = {}
        for order, data in enumerate(CATEGORIES_DATA):
            cat, created = Category.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "name": data["name"],
                    "description": f"Cursos de {data['name']} en Longevity 360",
                    "icon": data["icon"],
                    "section": longevity,
                    "order": order,
                    "is_active": True,
                },
            )
            categories[cat.slug] = cat
            if created:
                self.stdout.write(f"  Categoría: {cat.name}")
        return categories

    # ── Users ─────────────────────────────────────────────────────────────────
    def _create_users(self, user_data_list, role, sections):
        users = {}
        for u in user_data_list:
            if User.objects.filter(email=u["email"]).exists():
                user = User.objects.get(email=u["email"])
                self.stdout.write(f"  [existe] {u['email']}")
            else:
                user = User.objects.create_user(
                    email=u["email"],
                    username=u["username"],
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    password="Demo12345!",
                    role=role,
                    phone=u["phone"],
                )
                Profile.objects.get_or_create(user=user, defaults={"has_completed_survey": True})
                self.stdout.write(self.style.SUCCESS(f"  [creado] {role}: {u['email']}"))

            section = sections.get(u["section"])
            if section:
                SectionMembership.objects.get_or_create(
                    user=user, section=section,
                    defaults={"role": role, "is_active": True},
                )
            users[u["email"]] = user
        return users

    # ── Courses ───────────────────────────────────────────────────────────────
    def _create_courses(self, sections, categories, instructors):
        courses_by_section = {"maily-academia": [], "longevity-360": [], "corporativo-camsa": []}

        for c_data in ALL_COURSES:
            section = sections.get(c_data["section_slug"])
            instructor = instructors.get(c_data["instructor_email"])
            if not instructor:
                self.stdout.write(self.style.ERROR(f"  Instructor no encontrado: {c_data['instructor_email']}"))
                continue

            category = categories.get(c_data.get("category_slug")) if c_data.get("category_slug") else None

            course, created = Course.objects.get_or_create(
                title=c_data["title"],
                defaults={
                    "description": c_data["description"],
                    "thumbnail": c_data["thumbnail"],
                    "instructor": instructor,
                    "section": section,
                    "category": category,
                    "level": c_data["level"],
                    "duration": c_data["duration"],
                    "rating": Decimal(c_data["rating"]),
                    "price": Decimal(c_data["price"]),
                    "status": "published",
                },
            )
            if not created:
                self.stdout.write(f"  [existe] {course.title}")
                courses_by_section[c_data["section_slug"]].append(course)
                continue

            self.stdout.write(self.style.SUCCESS(f"  [creado] {course.title}"))

            for m_idx, m_data in enumerate(c_data["modules"]):
                module = Module.objects.create(
                    course=course,
                    title=m_data["title"],
                    description=m_data["description"],
                    order=m_idx + 1,
                )
                for l_idx, l_data in enumerate(m_data["lessons"]):
                    Lesson.objects.create(
                        module=module,
                        title=l_data["title"],
                        description=l_data.get("description", l_data["title"]),
                        video_url=YT_EMBED,
                        video_provider="youtube",
                        duration=l_data["duration"],
                        order=l_idx + 1,
                    )
                quiz_questions = m_data.get("quiz", [])
                if quiz_questions:
                    quiz = Quiz.objects.create(
                        module=module,
                        title=f"Quiz – {m_data['title']}",
                        passing_score=70,
                    )
                    for q_idx, q_data in enumerate(quiz_questions):
                        Question.objects.create(
                            quiz=quiz,
                            text=q_data["text"],
                            question_type=q_data.get("question_type", "multiple_choice"),
                            options=q_data.get("options", []),
                            correct_answer=q_data.get("correct_answer"),
                            config=q_data.get("config", {}),
                            order=q_idx + 1,
                        )

            courses_by_section[c_data["section_slug"]].append(course)

        return courses_by_section

    # ── Student history ───────────────────────────────────────────────────────
    def _create_student_history(self, students, courses_by_section, sections):
        section_students = {slug: [] for slug in courses_by_section}
        for u_data in STUDENTS:
            section_students[u_data["section"]].append(students[u_data["email"]])

        for section_slug, student_list in section_students.items():
            section_courses = courses_by_section.get(section_slug, [])
            if not section_courses:
                continue

            for student in student_list:
                # Cada alumno se inscribe en 2-3 cursos de su academia
                num_courses = rng.randint(2, min(3, len(section_courses)))
                enrolled_courses = rng.sample(section_courses, num_courses)

                for course in enrolled_courses:
                    enroll_days = rng.randint(10, 60)
                    enrollment = Enrollment.objects.create(user=student, course=course)
                    Enrollment.objects.filter(pk=enrollment.pk).update(
                        enrolled_at=days_ago(enroll_days)
                    )

                    # Registro de actividad: inicio de curso
                    act = UserActivity.objects.create(
                        user=student, action="course_start",
                        resource_type="course", resource_id=course.id,
                        metadata={"course_title": course.title},
                    )
                    UserActivity.objects.filter(pk=act.pk).update(created_at=days_ago(enroll_days))

                    # Si el curso es de pago, crear Purchase
                    if course.price and course.price > 0:
                        purchase = Purchase.objects.create(
                            user=student, course=course,
                            amount=course.price,
                            status=Purchase.Status.COMPLETED,
                            payment_method="card",
                        )
                        Purchase.objects.filter(pk=purchase.pk).update(
                            paid_at=days_ago(enroll_days + 1)
                        )

                    # Obtener todas las lecciones del curso
                    all_lessons = list(
                        Lesson.objects.filter(module__course=course).order_by("module__order", "order")
                    )
                    if not all_lessons:
                        continue

                    # 70-90% de lecciones completadas
                    completed_count = int(len(all_lessons) * rng.uniform(0.7, 0.95))
                    completed_lessons = all_lessons[:completed_count]
                    last_lesson = all_lessons[completed_count] if completed_count < len(all_lessons) else None

                    for i, lesson in enumerate(completed_lessons):
                        lesson_days = enroll_days - rng.randint(1, enroll_days)
                        lp = LessonProgress.objects.create(
                            user=student, lesson=lesson,
                            completed=True,
                            video_position_seconds=int(lesson.duration.split(":")[0]) * 60 if ":" in (lesson.duration or "") else rng.randint(180, 900),
                        )
                        LessonProgress.objects.filter(pk=lp.pk).update(
                            completed_at=days_ago(max(1, lesson_days))
                        )
                        # Actividad de vista
                        act2 = UserActivity.objects.create(
                            user=student, action="lesson_view",
                            resource_type="lesson", resource_id=lesson.id,
                            metadata={"lesson_title": lesson.title, "completed": True},
                        )
                        UserActivity.objects.filter(pk=act2.pk).update(
                            created_at=days_ago(max(1, lesson_days))
                        )

                    # Lección en progreso (no completada)
                    if last_lesson:
                        lp = LessonProgress.objects.create(
                            user=student, lesson=last_lesson,
                            completed=False,
                            video_position_seconds=rng.randint(30, 120),
                        )
                        LessonProgress.objects.filter(pk=lp.pk).update(
                            completed_at=days_ago(rng.randint(1, 3))
                        )

                    # Intentos de quiz para módulos completados
                    completed_lesson_ids = {l.id for l in completed_lessons}
                    for module in course.modules.all():
                        module_lessons = list(module.lessons.all())
                        if not module_lessons:
                            continue
                        all_mod_done = all(l.id in completed_lesson_ids for l in module_lessons)
                        if all_mod_done and hasattr(module, "quiz"):
                            try:
                                quiz = module.quiz
                                questions = list(quiz.questions.all())
                                answers = {}
                                score = 0
                                for q in questions:
                                    if q.question_type in ("multiple_choice", "true_false"):
                                        selected = q.correct_answer if rng.random() > 0.25 else rng.randint(0, max(0, len(q.options) - 1))
                                        answers[str(q.id)] = selected
                                        if selected == q.correct_answer:
                                            score += 1
                                    else:
                                        answers[str(q.id)] = None
                                final_score = int((score / len(questions)) * 100) if questions else 80
                                attempt = QuizAttempt.objects.create(
                                    user=student, quiz=quiz,
                                    answers=answers,
                                    score=final_score,
                                    passed=final_score >= quiz.passing_score,
                                )
                                QuizAttempt.objects.filter(pk=attempt.pk).update(
                                    attempted_at=days_ago(rng.randint(1, 7))
                                )
                                # Actividad quiz
                                act3 = UserActivity.objects.create(
                                    user=student, action="quiz_attempt",
                                    resource_type="quiz", resource_id=quiz.id,
                                    metadata={"score": final_score, "passed": final_score >= quiz.passing_score},
                                )
                                UserActivity.objects.filter(pk=act3.pk).update(
                                    created_at=days_ago(rng.randint(1, 7))
                                )
                            except Exception:
                                pass

                    # Certificado si completó ≥90% del curso
                    completion_rate = completed_count / len(all_lessons)
                    if completion_rate >= 0.9:
                        cert, created = Certificate.objects.get_or_create(
                            user=student, course=course,
                        )
                        if created:
                            Certificate.objects.filter(pk=cert.pk).update(
                                issued_at=days_ago(rng.randint(1, 5))
                            )
                            act4 = UserActivity.objects.create(
                                user=student, action="certificate_earned",
                                resource_type="course", resource_id=course.id,
                                metadata={"course_title": course.title},
                            )
                            UserActivity.objects.filter(pk=act4.pk).update(
                                created_at=days_ago(rng.randint(1, 5))
                            )

        # Login activities para todos los alumnos
        for u_data in STUDENTS:
            student = students[u_data["email"]]
            for _ in range(rng.randint(8, 20)):
                act = UserActivity.objects.create(
                    user=student, action="login",
                    resource_type="session", resource_id=None,
                    metadata={},
                )
                UserActivity.objects.filter(pk=act.pk).update(
                    created_at=days_ago(rng.randint(1, 60))
                )

    # ── Summary ───────────────────────────────────────────────────────────────
    def _print_summary(self, instructors, students, courses_by_section):
        total_courses = sum(len(v) for v in courses_by_section.values())
        total_lessons = Lesson.objects.count()
        total_quizzes = Quiz.objects.count()
        total_enrollments = Enrollment.objects.count()
        total_purchases = Purchase.objects.count()
        total_progress = LessonProgress.objects.count()
        total_certs = Certificate.objects.count()
        total_activities = UserActivity.objects.count()

        self.stdout.write("\n" + "=" * 55)
        self.stdout.write(self.style.SUCCESS("  RESUMEN DEL SEED DE PRESENTACIÓN"))
        self.stdout.write("=" * 55)
        self.stdout.write(f"  Instructores creados : {len(instructors)}")
        self.stdout.write(f"  Alumnos creados      : {len(students)}")
        self.stdout.write(f"  Cursos totales       : {total_courses}")
        self.stdout.write(f"    Maily Academia     : {len(courses_by_section.get('maily-academia', []))} (todos gratis)")
        self.stdout.write(f"    Longevity 360      : {len(courses_by_section.get('longevity-360', []))} (10 gratis + 10 pago)")
        self.stdout.write(f"    Corporativo CAMSA  : {len(courses_by_section.get('corporativo-camsa', []))} (todos internos)")
        self.stdout.write(f"  Lecciones totales    : {total_lessons}")
        self.stdout.write(f"  Quizzes totales      : {total_quizzes}")
        self.stdout.write(f"  Inscripciones        : {total_enrollments}")
        self.stdout.write(f"  Compras completadas  : {total_purchases}")
        self.stdout.write(f"  Progreso de lecciones: {total_progress}")
        self.stdout.write(f"  Certificados         : {total_certs}")
        self.stdout.write(f"  Actividades          : {total_activities}")
        self.stdout.write("=" * 55)
        self.stdout.write("\n  CREDENCIALES DEMO (contraseña: Demo12345!)")
        self.stdout.write("  Instructores:")
        for email in [u["email"] for u in INSTRUCTORS]:
            self.stdout.write(f"    {email}")
        self.stdout.write("  Alumnos:")
        for email in [u["email"] for u in STUDENTS]:
            self.stdout.write(f"    {email}")
        self.stdout.write("=" * 55 + "\n")
