import { motion } from 'framer-motion';

export const ProgressBar = ({
  value = 0,
  max = 100,
  size = 'md',
  showLabel = true,
  color = 'maily',
  className = ''
}) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colors = {
    maily: 'bg-maily dark:bg-blue-500',
    accent: 'bg-orange-500 dark:bg-orange-600',
    green: 'bg-green-500 dark:bg-green-600',
    blue: 'bg-blue-500 dark:bg-blue-600'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progreso</span>
          <span className="text-sm font-semibold text-maily dark:text-blue-400">{percentage}%</span>
        </div>
      )}
      <div className={`w-full ${sizes[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full ${colors[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// Barra de progreso vertical para la vista de módulos
export const VerticalProgress = ({
  steps = [],
  currentStep = 0,
  completedSteps = [],
  onStepClick,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Línea de conexión */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      {/* Línea de progreso */}
      <motion.div
        className="absolute left-4 top-0 w-0.5 bg-maily dark:bg-blue-500"
        initial={{ height: 0 }}
        animate={{
          height: `${(completedSteps.length / steps.length) * 100}%`
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Steps */}
      <div className="relative space-y-6">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = index === currentStep;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 cursor-pointer group"
              onClick={() => onStepClick && onStepClick(step, index)}
            >
              {/* Indicador */}
              <div className="relative z-10">
                <motion.div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isCompleted
                      ? 'bg-maily dark:bg-blue-600 text-white'
                      : isCurrent
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-maily dark:border-blue-500 text-maily dark:text-blue-400'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                    }
                  `}
                  whileHover={{ scale: 1.1 }}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </motion.div>

                {/* Pulse para el paso actual */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full bg-maily/30 dark:bg-blue-500/30 animate-ping" />
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 pt-1">
                <h4 className={`
                  font-medium transition-colors
                  ${isCompleted ? 'text-maily dark:text-blue-400' : isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}
                  group-hover:text-maily dark:group-hover:text-blue-400
                `}>
                  {step.title}
                </h4>
                {step.duration && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{step.duration}</p>
                )}
              </div>

              {/* Badge de completado */}
              {isCompleted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-medium rounded-full"
                >
                  Completado
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
