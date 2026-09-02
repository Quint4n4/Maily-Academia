"""Sanitización HTML centralizada con bleach para defensa en profundidad."""
import bleach

ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'ol', 'ul', 'li',
    'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre',
    'img', 'span', 'div', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'sub', 'sup',
]

ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height'],
    'span': ['style'],
    'div': ['style'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
}


def sanitize_html(value):
    """Sanitiza HTML permitiendo solo tags y atributos seguros."""
    if not value:
        return value
    return bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
    )
