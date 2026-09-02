from django.urls import path

from . import views

urlpatterns = [
    path('lessons/<int:lesson_id>/questions/', views.QuestionListView.as_view(), name='qna-question-list'),
    path('lessons/<int:lesson_id>/questions/create/', views.QuestionCreateView.as_view(), name='qna-question-create'),
    path('questions/<int:question_id>/answers/', views.AnswerCreateView.as_view(), name='qna-answer-create'),
    path('answers/<int:answer_id>/accept/', views.AnswerAcceptView.as_view(), name='qna-answer-accept'),
    path('qna/instructor/', views.InstructorQnAListView.as_view(), name='qna-instructor-list'),
    path('qna/instructor-stats/', views.InstructorQnAStatsView.as_view(), name='qna-instructor-stats'),
]
