"""
Calificación de preguntas de quiz por tipo.
Cada grader recibe (question, student_answer) y retorna:
  { "is_correct": bool, "score": float (0.0 a 1.0), "details": dict }
"""


def _result(is_correct, score, details=None):
    return {
        "is_correct": is_correct,
        "score": float(score),
        "details": details or {},
    }


def grade_multiple_choice(question, student_answer):
    """
    student_answer: int (índice de la opción elegida).
    """
    if student_answer is None:
        return _result(False, 0.0, {"reason": "no_answer"})
    correct_idx = question.correct_answer
    if correct_idx is None:
        correct_idx = 0
    try:
        idx = int(student_answer)
    except (TypeError, ValueError):
        return _result(False, 0.0, {"reason": "invalid_answer"})
    is_correct = idx == correct_idx
    return _result(is_correct, 1.0 if is_correct else 0.0, {"selected": idx, "correct": correct_idx})


def grade_true_false(question, student_answer):
    """
    Igual que opción múltiple: options = ["Verdadero", "Falso"], correct_answer = 0 o 1.
    student_answer: int (0 = Verdadero, 1 = Falso).
    """
    return grade_multiple_choice(question, student_answer)


def grade_word_order(question, student_answer):
    """
    student_answer: list of int (orden de índices elegido por el alumno).
    config: { "items": [...], "correct_order": [0,1,2,...] }
    Puntuación parcial: proporción de elementos en la posición correcta.
    """
    config = question.config or {}
    correct_order = config.get("correct_order") or []
    if not correct_order:
        return _result(False, 0.0, {"reason": "no_correct_order"})
    if student_answer is None or not isinstance(student_answer, list):
        return _result(False, 0.0, {"reason": "invalid_answer"})
    if len(student_answer) != len(correct_order):
        return _result(False, 0.0, {"reason": "length_mismatch"})
    correct_count = sum(1 for i, a in enumerate(student_answer) if a == correct_order[i])
    score = correct_count / len(correct_order) if correct_order else 0.0
    is_correct = score >= 1.0
    return _result(is_correct, score, {"correct_count": correct_count, "total": len(correct_order)})


def grade_word_search(question, student_answer):
    """
    student_answer: list of strings (palabras encontradas) o list of {word, positions}.
    config: { "words": [...] } o "words_to_find" o "word_positions".
    Puntuación: palabras correctas / total palabras.
    """
    config = question.config or {}
    words_to_find = config.get("words_to_find") or config.get("words") or []
    if not words_to_find:
        words_to_find = [w.get("word") for w in config.get("word_positions", []) if w.get("word")]
    words_to_find = [w.upper().strip() for w in words_to_find if w]
    if not words_to_find:
        return _result(False, 0.0, {"reason": "no_words_configured"})
    if student_answer is None:
        return _result(False, 0.0, {"reason": "no_answer"})
    if isinstance(student_answer, list):
        found = [str(x).upper().strip() for x in student_answer if x]
    else:
        return _result(False, 0.0, {"reason": "invalid_answer"})
    correct_count = sum(1 for w in words_to_find if w in found)
    score = correct_count / len(words_to_find) if words_to_find else 0.0
    is_correct = score >= 1.0
    return _result(is_correct, score, {"correct_count": correct_count, "total": len(words_to_find)})


def grade_crossword(question, student_answer):
    """
    student_answer: dict { "row_col": "letter" } ej. {"0_2": "C", "1_2": "E"}.
    config: { "words": [ {"word": "CELULA", "start_row", "start_col", "direction": "horizontal"|"vertical"}, ... ] }
    Validamos que las letras en las posiciones de cada palabra coincidan.
    """
    config = question.config or {}
    words_config = config.get("words") or []
    if not words_config:
        return _result(False, 0.0, {"reason": "no_words_configured"})
    if student_answer is None or not isinstance(student_answer, dict):
        return _result(False, 0.0, {"reason": "invalid_answer"})
    total_cells = 0
    correct_cells = 0
    for wc in words_config:
        word = (wc.get("word") or "").upper()
        if not word:
            continue
        start_row = int(wc.get("start_row", 0))
        start_col = int(wc.get("start_col", 0))
        direction = wc.get("direction", "horizontal")
        for i, letter in enumerate(word):
            if direction == "horizontal":
                r, c = start_row, start_col + i
            else:
                r, c = start_row + i, start_col
            key = f"{r}_{c}"
            total_cells += 1
            if student_answer.get(key, "").strip().upper() == letter:
                correct_cells += 1
    score = correct_cells / total_cells if total_cells else 0.0
    is_correct = score >= 1.0
    return _result(is_correct, score, {"correct_cells": correct_cells, "total_cells": total_cells})


def grade_matching(question, student_answer):
    """
    student_answer: dict { left_id: right_id } (ids de los pares).
    config: { "pairs": [ {"id": 1, "left": "...", "right": "..."}, ... ] }
    Correcto si cada left_id está emparejado con el right_id del mismo par.
    """
    config = question.config or {}
    pairs = config.get("pairs") or []
    if not pairs:
        return _result(False, 0.0, {"reason": "no_pairs_configured"})
    if student_answer is None or not isinstance(student_answer, dict):
        return _result(False, 0.0, {"reason": "invalid_answer"})
    correct_count = 0
    for p in pairs:
        left_id = p.get("id")
        if left_id is None:
            continue
        expected_right = p.get("right_id", p.get("id"))
        actual_right = student_answer.get(left_id) if student_answer.get(left_id) is not None else student_answer.get(str(left_id))
        if actual_right is not None and str(actual_right) == str(expected_right):
            correct_count += 1
    total = len([p for p in pairs if p.get("id") is not None])
    score = correct_count / total if total else 0.0
    is_correct = score >= 1.0
    return _result(is_correct, score, {"correct_count": correct_count, "total": total})


def grade_fill_blank(question, student_answer):
    """
    student_answer: dict { blank_id: "texto" } (id puede ser int o str).
    config: { "blanks": [ {"id": 1, "correct_answers": ["célula", "celula"]}, ... ] }
    Comparación case-insensitive; acepta cualquiera de correct_answers.
    """
    config = question.config or {}
    blanks = config.get("blanks") or []
    if not blanks:
        return _result(False, 0.0, {"reason": "no_blanks_configured"})
    if student_answer is None or not isinstance(student_answer, dict):
        return _result(False, 0.0, {"reason": "invalid_answer"})
    correct_count = 0
    for bl in blanks:
        blank_id = bl.get("id")
        if blank_id is None:
            continue
        accepted = bl.get("correct_answers") or []
        if not accepted:
            continue
        accepted_norm = [a.strip().lower() for a in accepted if a]
        raw = student_answer.get(blank_id) or student_answer.get(str(blank_id))
        if raw is None:
            continue
        if isinstance(raw, str) and raw.strip().lower() in accepted_norm:
            correct_count += 1
        elif isinstance(raw, (int, float)) and str(raw).strip().lower() in accepted_norm:
            correct_count += 1
    total = len(blanks)
    score = correct_count / total if total else 0.0
    is_correct = score >= 1.0
    return _result(is_correct, score, {"correct_count": correct_count, "total": total})


GRADERS = {
    "multiple_choice": grade_multiple_choice,
    "word_order": grade_word_order,
    "word_search": grade_word_search,
    "true_false": grade_true_false,
    "crossword": grade_crossword,
    "matching": grade_matching,
    "fill_blank": grade_fill_blank,
}


def grade_question(question, student_answer):
    """
    Delega al grader según question.question_type.
    Retorna { "is_correct": bool, "score": float (0.0-1.0), "details": dict }.
    """
    qtype = (question.question_type or "multiple_choice").strip() or "multiple_choice"
    grader = GRADERS.get(qtype)
    if not grader:
        # Fallback: tratar como multiple_choice si tiene options/correct_answer
        grader = grade_multiple_choice
    return grader(question, student_answer)
