import MultipleChoice from './MultipleChoice';
import TrueFalse from './TrueFalse';
import WordSearch from './WordSearch';
import Matching from './Matching';
import WordOrder from './WordOrder';
import Crossword from './Crossword';
import FillBlank from './FillBlank';

const COMPONENTS = {
  multiple_choice: MultipleChoice,
  true_false: TrueFalse,
  word_search: WordSearch,
  matching: Matching,
  // Tipos legacy (por si hay preguntas antiguas):
  word_order: WordOrder,
  crossword: Crossword,
  fill_blank: FillBlank,
};

/**
 * Renderiza el tipo de pregunta según question.question_type.
 * value / onChange: valor actual y callback para la respuesta (formato depende del tipo).
 */
export default function QuizRenderer({ question, value, onChange, disabled = false }) {
  const qtype = (question.question_type || 'multiple_choice').trim() || 'multiple_choice';
  const Component = COMPONENTS[qtype] || MultipleChoice;

  return (
    <Component
      question={question}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export { MultipleChoice, TrueFalse, WordSearch, Matching, WordOrder, Crossword, FillBlank };
