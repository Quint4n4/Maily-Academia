import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  accent: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base'
};

export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  animated = false
}) => {
  const Component = animated ? motion.span : 'span';
  const animationProps = animated ? {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { type: 'spring', stiffness: 500, damping: 25 }
  } : {};

  return (
    <Component
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...animationProps}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </Component>
  );
};

export default Badge;
