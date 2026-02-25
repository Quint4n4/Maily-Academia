"""
Management command to populate the database with initial data
migrated from cursos-maily/src/data/courses.js plus test users.

Usage:
    python manage.py seed_data
    python manage.py seed_data --flush   # clear existing data first
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.users.models import Profile
from apps.courses.models import Course, Module, Lesson
from apps.quizzes.models import Quiz, Question

User = get_user_model()

YOUTUBE_URL = "https://www.youtube.com/embed/8mAITcNt710"


# ──────────────────────────────────────────────────────────────────────────────
# Test users
# ──────────────────────────────────────────────────────────────────────────────
TEST_USERS = [
    {
        "email": "admin@maily.com",
        "username": "admin",
        "first_name": "Admin",
        "last_name": "Maily",
        "password": "Admin12345!",
        "role": "admin",
    },
    {
        "email": "maria.garcia@maily.com",
        "username": "maria_garcia",
        "first_name": "María",
        "last_name": "García",
        "password": "Profesor12345!",
        "role": "instructor",
    },
    {
        "email": "carlos.rodriguez@maily.com",
        "username": "carlos_rodriguez",
        "first_name": "Carlos",
        "last_name": "Rodríguez",
        "password": "Profesor12345!",
        "role": "instructor",
    },
    {
        "email": "ana.martinez@maily.com",
        "username": "ana_martinez",
        "first_name": "Ana",
        "last_name": "Martínez",
        "password": "Profesor12345!",
        "role": "instructor",
    },
    {
        "email": "estudiante1@maily.com",
        "username": "estudiante1",
        "first_name": "Juan",
        "last_name": "Pérez",
        "password": "Estudiante12345!",
        "role": "student",
    },
    {
        "email": "estudiante2@maily.com",
        "username": "estudiante2",
        "first_name": "Laura",
        "last_name": "López",
        "password": "Estudiante12345!",
        "role": "student",
    },
]


# ──────────────────────────────────────────────────────────────────────────────
# Courses data (migrated from courses.js)
# ──────────────────────────────────────────────────────────────────────────────
COURSES_DATA = [
    {
        "title": "Fundamentos de Maily",
        "description": "Aprende desde cero a utilizar todas las funcionalidades básicas del software Maily. Este curso te guiará paso a paso.",
        "thumbnail": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
        "instructor_email": "maria.garcia@maily.com",
        "duration": "4 horas",
        "level": "beginner",
        "rating": 4.8,
        "modules": [
            {
                "title": "Módulo 1: Introducción y Configuración",
                "description": "Conoce la interfaz y configura tu entorno de trabajo",
                "lessons": [
                    {"title": "Bienvenida al curso", "duration": "5:30", "description": "Introducción al curso y objetivos de aprendizaje"},
                    {"title": "Instalación del software", "duration": "12:45", "description": "Guía paso a paso para instalar Maily en tu computadora"},
                    {"title": "Conociendo la interfaz", "duration": "18:20", "description": "Tour completo por la interfaz principal del software"},
                    {"title": "Configuración inicial", "duration": "10:15", "description": "Personaliza tu entorno de trabajo según tus necesidades"},
                ],
                "quiz": {
                    "title": "Quiz: Introducción y Configuración",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Cuál es el primer paso al abrir Maily por primera vez?", "options": ["Crear una cuenta de usuario", "Configurar las preferencias", "Importar datos existentes", "Actualizar el software"], "correct_answer": 0},
                        {"text": "¿Dónde se encuentran las opciones de configuración principal?", "options": ["En el menú Archivo", "En el menú Configuración", "En la barra de herramientas", "En el panel lateral"], "correct_answer": 1},
                        {"text": "¿Qué formato de archivo utiliza Maily para los proyectos?", "options": [".mly", ".doc", ".pdf", ".xlsx"], "correct_answer": 0},
                    ],
                },
            },
            {
                "title": "Módulo 2: Funciones Básicas",
                "description": "Domina las operaciones fundamentales del día a día",
                "lessons": [
                    {"title": "Creando tu primer proyecto", "duration": "15:00", "description": "Aprende a crear y gestionar proyectos desde cero"},
                    {"title": "Importación de datos", "duration": "20:30", "description": "Cómo importar información de diferentes fuentes"},
                    {"title": "Navegación y búsqueda", "duration": "12:00", "description": "Técnicas para encontrar rápidamente lo que necesitas"},
                    {"title": "Edición básica de registros", "duration": "18:45", "description": "Modifica y actualiza información de manera eficiente"},
                ],
                "quiz": {
                    "title": "Quiz: Funciones Básicas",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Cuántos tipos de proyectos se pueden crear en Maily?", "options": ["2 tipos", "3 tipos", "4 tipos", "5 tipos"], "correct_answer": 2},
                        {"text": "¿Qué atajo de teclado abre la búsqueda rápida?", "options": ["Ctrl + F", "Ctrl + B", "Ctrl + S", "Ctrl + N"], "correct_answer": 0},
                        {"text": "¿Desde qué formatos se pueden importar datos?", "options": ["Solo Excel", "Excel y CSV", "Excel, CSV y JSON", "Todos los formatos mencionados más XML"], "correct_answer": 3},
                    ],
                },
            },
            {
                "title": "Módulo 3: Reportes y Exportación",
                "description": "Genera informes profesionales y comparte tu trabajo",
                "lessons": [
                    {"title": "Generación de reportes básicos", "duration": "16:00", "description": "Crea reportes estandarizados de forma rápida"},
                    {"title": "Personalización de reportes", "duration": "22:15", "description": "Adapta los reportes a tus necesidades específicas"},
                    {"title": "Exportación en diferentes formatos", "duration": "14:30", "description": "PDF, Excel, y otros formatos de exportación"},
                    {"title": "Compartir y colaborar", "duration": "11:00", "description": "Trabaja en equipo y comparte tu trabajo fácilmente"},
                ],
                "quiz": {
                    "title": "Quiz: Reportes y Exportación",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Cuál es el formato recomendado para compartir reportes oficiales?", "options": ["Excel", "PDF", "Word", "HTML"], "correct_answer": 1},
                        {"text": "¿Se pueden programar reportes automáticos?", "options": ["No, solo manuales", "Sí, diariamente", "Sí, con múltiples frecuencias", "Solo en la versión premium"], "correct_answer": 2},
                        {"text": "¿Cuántos usuarios pueden colaborar simultáneamente en un proyecto?", "options": ["Hasta 5", "Hasta 10", "Hasta 25", "Sin límite"], "correct_answer": 3},
                    ],
                },
            },
        ],
    },
    {
        "title": "Maily Avanzado",
        "description": "Lleva tus habilidades al siguiente nivel con funciones avanzadas, automatizaciones y trucos de productividad.",
        "thumbnail": "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop",
        "instructor_email": "carlos.rodriguez@maily.com",
        "duration": "6 horas",
        "level": "advanced",
        "rating": 4.9,
        "modules": [
            {
                "title": "Módulo 1: Automatizaciones",
                "description": "Crea flujos de trabajo automáticos",
                "lessons": [
                    {"title": "Introducción a las automatizaciones", "duration": "10:00", "description": "Qué son y cómo pueden ayudarte"},
                    {"title": "Creando tu primera automatización", "duration": "25:00", "description": "Paso a paso para crear flujos automáticos"},
                    {"title": "Triggers y condiciones", "duration": "20:00", "description": "Configura cuándo y cómo se ejecutan"},
                    {"title": "Casos de uso prácticos", "duration": "30:00", "description": "Ejemplos reales de automatización"},
                    {"title": "Solución de problemas comunes", "duration": "15:00", "description": "Debugging y optimización"},
                ],
                "quiz": {
                    "title": "Quiz: Automatizaciones",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Qué es un trigger en automatización?", "options": ["Una acción final", "El evento que inicia la automatización", "Un tipo de reporte", "Una configuración de usuario"], "correct_answer": 1},
                        {"text": "¿Cuántas condiciones puede tener una automatización?", "options": ["Máximo 3", "Máximo 5", "Máximo 10", "Sin límite"], "correct_answer": 3},
                        {"text": "¿Cuál es la mejor práctica al crear automatizaciones?", "options": ["Crear una grande que haga todo", "Dividir en pequeñas automatizaciones específicas", "No usar condiciones", "Ejecutar siempre manualmente primero"], "correct_answer": 1},
                    ],
                },
            },
            {
                "title": "Módulo 2: Integraciones",
                "description": "Conecta Maily con otras herramientas",
                "lessons": [
                    {"title": "Visión general de integraciones", "duration": "12:00", "description": "Herramientas compatibles con Maily"},
                    {"title": "Integración con Excel", "duration": "18:00", "description": "Sincronización bidireccional"},
                    {"title": "Integración con Google Workspace", "duration": "20:00", "description": "Calendar, Drive y más"},
                    {"title": "APIs y webhooks", "duration": "25:00", "description": "Para desarrolladores y usuarios avanzados"},
                    {"title": "Casos de integración empresarial", "duration": "22:00", "description": "Ejemplos de grandes implementaciones"},
                ],
                "quiz": {
                    "title": "Quiz: Integraciones",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Qué es un webhook?", "options": ["Un tipo de reporte", "Una notificación automática a sistemas externos", "Un formato de archivo", "Una herramienta de diseño"], "correct_answer": 1},
                        {"text": "¿Con qué servicio de Google NO se integra Maily?", "options": ["Google Calendar", "Google Drive", "Google Photos", "Google Sheets"], "correct_answer": 2},
                        {"text": "¿Qué protocolo usa la API de Maily?", "options": ["SOAP", "GraphQL", "REST", "gRPC"], "correct_answer": 2},
                    ],
                },
            },
            {
                "title": "Módulo 3: Análisis Avanzado",
                "description": "Dashboards y métricas personalizadas",
                "lessons": [
                    {"title": "Creación de dashboards", "duration": "28:00", "description": "Visualiza tus datos de forma efectiva"},
                    {"title": "KPIs y métricas personalizadas", "duration": "22:00", "description": "Define lo que realmente importa medir"},
                    {"title": "Filtros y segmentación avanzada", "duration": "18:00", "description": "Analiza datos específicos"},
                    {"title": "Exportación de análisis", "duration": "15:00", "description": "Comparte insights con tu equipo"},
                    {"title": "Mejores prácticas de análisis", "duration": "20:00", "description": "Consejos de expertos"},
                ],
                "quiz": {
                    "title": "Quiz: Análisis Avanzado",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Qué es un KPI?", "options": ["Key Personal Information", "Key Performance Indicator", "Knowledge Process Integration", "Key Process Index"], "correct_answer": 1},
                        {"text": "¿Cuántos widgets puede tener un dashboard?", "options": ["Máximo 6", "Máximo 12", "Máximo 20", "Sin límite"], "correct_answer": 3},
                        {"text": "¿Cuál es la mejor práctica para dashboards?", "options": ["Incluir todos los datos posibles", "Enfocarse en las métricas más relevantes", "Usar solo gráficos de barras", "Actualizar manualmente los datos"], "correct_answer": 1},
                    ],
                },
            },
        ],
    },
    {
        "title": "Maily para Equipos",
        "description": "Aprende a gestionar equipos de trabajo, permisos, roles y colaboración efectiva dentro de Maily.",
        "thumbnail": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop",
        "instructor_email": "ana.martinez@maily.com",
        "duration": "3 horas",
        "level": "intermediate",
        "rating": 4.7,
        "modules": [
            {
                "title": "Módulo 1: Gestión de Usuarios",
                "description": "Administra tu equipo eficientemente",
                "lessons": [
                    {"title": "Roles y permisos", "duration": "20:00", "description": "Configura quién puede hacer qué"},
                    {"title": "Invitar miembros al equipo", "duration": "10:00", "description": "Proceso de onboarding de nuevos usuarios"},
                    {"title": "Grupos de trabajo", "duration": "15:00", "description": "Organiza tu equipo en grupos"},
                ],
                "quiz": {
                    "title": "Quiz: Gestión de Usuarios",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Cuántos roles predefinidos tiene Maily?", "options": ["3", "4", "5", "6"], "correct_answer": 2},
                        {"text": "¿Quién puede modificar los permisos de un rol?", "options": ["Cualquier usuario", "Solo administradores", "Solo el propietario", "Administradores y propietario"], "correct_answer": 3},
                        {"text": "¿Se pueden crear roles personalizados?", "options": ["No", "Sí, ilimitados", "Sí, hasta 10", "Solo en plan empresarial"], "correct_answer": 1},
                    ],
                },
            },
            {
                "title": "Módulo 2: Colaboración en Tiempo Real",
                "description": "Trabaja simultáneamente con tu equipo",
                "lessons": [
                    {"title": "Edición colaborativa", "duration": "18:00", "description": "Múltiples usuarios editando al mismo tiempo"},
                    {"title": "Comentarios y menciones", "duration": "12:00", "description": "Comunícate dentro del software"},
                    {"title": "Historial de cambios", "duration": "15:00", "description": "Rastrea quién hizo qué y cuándo"},
                ],
                "quiz": {
                    "title": "Quiz: Colaboración",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Cómo se menciona a un usuario?", "options": ["#usuario", "@usuario", "/usuario", "!usuario"], "correct_answer": 1},
                        {"text": "¿Por cuánto tiempo se guarda el historial?", "options": ["30 días", "90 días", "1 año", "Indefinidamente"], "correct_answer": 3},
                        {"text": "¿Se pueden resolver comentarios?", "options": ["No", "Sí, solo el autor", "Sí, cualquier usuario", "Sí, el autor o un admin"], "correct_answer": 3},
                    ],
                },
            },
            {
                "title": "Módulo 3: Reportes de Equipo",
                "description": "Mide el rendimiento grupal",
                "lessons": [
                    {"title": "Dashboard de actividad", "duration": "20:00", "description": "Visualiza la actividad de tu equipo"},
                    {"title": "Reportes de productividad", "duration": "18:00", "description": "Métricas de desempeño"},
                    {"title": "Exportación y presentación", "duration": "12:00", "description": "Comparte resultados con stakeholders"},
                ],
                "quiz": {
                    "title": "Quiz: Reportes de Equipo",
                    "passing_score": 70,
                    "questions": [
                        {"text": "¿Qué métrica NO está disponible en el dashboard?", "options": ["Tiempo activo", "Tareas completadas", "Velocidad de escritura", "Proyectos modificados"], "correct_answer": 2},
                        {"text": "¿Se pueden programar reportes automáticos?", "options": ["No", "Sí, solo diarios", "Sí, diarios y semanales", "Sí, con múltiples frecuencias"], "correct_answer": 3},
                        {"text": "¿En qué formatos se pueden exportar los reportes?", "options": ["Solo PDF", "PDF y Excel", "PDF, Excel y PowerPoint", "PDF, Excel, PowerPoint y HTML"], "correct_answer": 3},
                    ],
                },
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed the database with test users and courses from courses.js'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete existing seed data before inserting',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write('Flushing existing data...')
            Question.objects.all().delete()
            Quiz.objects.all().delete()
            Lesson.objects.all().delete()
            Module.objects.all().delete()
            Course.objects.all().delete()
            User.objects.filter(email__endswith='@maily.com').delete()

        # ── Create users ──────────────────────────────────────────────────
        users = {}
        for u_data in TEST_USERS:
            email = u_data['email']
            if User.objects.filter(email=email).exists():
                users[email] = User.objects.get(email=email)
                self.stdout.write(f'  User already exists: {email}')
                continue

            if u_data['role'] == 'admin':
                user = User.objects.create_superuser(
                    email=email,
                    username=u_data['username'],
                    first_name=u_data['first_name'],
                    last_name=u_data['last_name'],
                    password=u_data['password'],
                    role='admin',
                )
            else:
                user = User.objects.create_user(
                    email=email,
                    username=u_data['username'],
                    first_name=u_data['first_name'],
                    last_name=u_data['last_name'],
                    password=u_data['password'],
                    role=u_data['role'],
                )
            Profile.objects.get_or_create(user=user)
            users[email] = user
            self.stdout.write(self.style.SUCCESS(f'  Created {u_data["role"]}: {email}'))

        # ── Create courses ────────────────────────────────────────────────
        for c_data in COURSES_DATA:
            instructor = users[c_data['instructor_email']]

            if Course.objects.filter(title=c_data['title']).exists():
                self.stdout.write(f'  Course already exists: {c_data["title"]}')
                continue

            course = Course.objects.create(
                instructor=instructor,
                title=c_data['title'],
                description=c_data['description'],
                thumbnail=c_data['thumbnail'],
                level=c_data['level'],
                duration=c_data['duration'],
                rating=c_data['rating'],
                status='published',
            )
            self.stdout.write(self.style.SUCCESS(f'  Created course: {course.title}'))

            for m_idx, m_data in enumerate(c_data['modules']):
                module = Module.objects.create(
                    course=course,
                    title=m_data['title'],
                    description=m_data['description'],
                    order=m_idx + 1,
                )

                for l_idx, l_data in enumerate(m_data['lessons']):
                    Lesson.objects.create(
                        module=module,
                        title=l_data['title'],
                        description=l_data['description'],
                        video_url=YOUTUBE_URL,
                        video_provider='youtube',
                        duration=l_data['duration'],
                        order=l_idx + 1,
                    )

                q_data = m_data.get('quiz')
                if q_data:
                    quiz = Quiz.objects.create(
                        module=module,
                        title=q_data['title'],
                        passing_score=q_data['passing_score'],
                    )
                    for qq_idx, qq_data in enumerate(q_data['questions']):
                        Question.objects.create(
                            quiz=quiz,
                            text=qq_data['text'],
                            options=qq_data['options'],
                            correct_answer=qq_data['correct_answer'],
                            order=qq_idx + 1,
                        )

        self.stdout.write(self.style.SUCCESS('\nSeed data loaded successfully!'))
        self.stdout.write(f'\nTest accounts:')
        for u in TEST_USERS:
            self.stdout.write(f'  {u["role"]:12s} → {u["email"]} / {u["password"]}')
