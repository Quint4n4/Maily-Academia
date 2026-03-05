"""Helper to log user activity for instructor analytics (Fase 7)."""
from apps.progress.models import UserActivity


def log_activity(user, action, resource_type, resource_id=None, metadata=None):
    """Create a UserActivity record. Safe to call from any view."""
    if not user or not user.is_authenticated:
        return
    UserActivity.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata or {},
    )
