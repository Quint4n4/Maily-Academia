from django.urls import path

from . import views

urlpatterns = [
    # Quizzes de módulo
    path('modules/<int:module_id>/quiz/', views.QuizByModuleView.as_view(), name='quiz-by-module'),
    path('modules/<int:module_id>/quiz/create/', views.QuizCreateView.as_view(), name='quiz-create'),
    path('quizzes/<int:quiz_id>/', views.QuizUpdateDeleteView.as_view(), name='quiz-detail'),
    path('quizzes/<int:quiz_id>/questions/', views.QuestionCreateView.as_view(), name='question-create'),
    path('quizzes/<int:quiz_id>/attempt/', views.QuizAttemptView.as_view(), name='quiz-attempt'),
    path('quizzes/<int:quiz_id>/results/', views.QuizResultsView.as_view(), name='quiz-results'),
    path('questions/<int:pk>/', views.QuestionDetailView.as_view(), name='question-detail'),

    # Evaluación final de curso (alumno)
    path(
        'courses/<int:course_id>/final-evaluation/request/',
        views.FinalEvaluationRequestView.as_view(),
        name='final-evaluation-request',
    ),
    path(
        'courses/<int:course_id>/final-evaluation/',
        views.FinalEvaluationDetailView.as_view(),
        name='final-evaluation-detail',
    ),
    path(
        'courses/<int:course_id>/final-evaluation/admin/',
        views.FinalEvaluationAdminView.as_view(),
        name='final-evaluation-admin',
    ),
    path(
        'final-evaluations/<int:evaluation_id>/attempt/',
        views.FinalEvaluationAttemptView.as_view(),
        name='final-evaluation-attempt',
    ),
    path(
        'final-evaluations/<int:evaluation_id>/questions/',
        views.FinalEvaluationQuestionCreateView.as_view(),
        name='final-evaluation-question-create',
    ),
    path(
        'final-evaluation-questions/<int:pk>/',
        views.FinalEvaluationQuestionDetailView.as_view(),
        name='final-evaluation-question-detail',
    ),

    # Panel de profesor para solicitudes de evaluación final
    path(
        'instructor/evaluations/requests/',
        views.InstructorFinalEvaluationRequestListView.as_view(),
        name='instructor-final-evaluation-requests',
    ),
    path(
        'instructor/evaluations/requests/<int:pk>/approve/',
        views.InstructorFinalEvaluationRequestApproveView.as_view(),
        name='instructor-final-evaluation-approve',
    ),
]
