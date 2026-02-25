from django.contrib import admin
from .models import QnAQuestion, QnAAnswer


class AnswerInline(admin.TabularInline):
    model = QnAAnswer
    extra = 0


@admin.register(QnAQuestion)
class QnAQuestionAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'lesson', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'body']
    inlines = [AnswerInline]


@admin.register(QnAAnswer)
class QnAAnswerAdmin(admin.ModelAdmin):
    list_display = ['question', 'user', 'is_accepted', 'created_at']
    list_filter = ['is_accepted', 'created_at']
