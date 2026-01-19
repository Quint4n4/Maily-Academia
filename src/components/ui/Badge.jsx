import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-maily-light text-maily',
  secondary: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  danger: 'bg-red-100 text-red-600',
  accent: 'bg-orange-100 text-orange-600'
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
