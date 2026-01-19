import { motion } from 'framer-motion';

export const Card = ({
  children,
  className = '',
  hover = true,
  padding = true,
  onClick,
  ...props
}) => {
  return (
    <motion.div
      whileHover={hover ? { y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' } : {}}
      className={`
        bg-white rounded-2xl
        border border-gray-100
        shadow-sm
        transition-all duration-300
        ${padding ? 'p-6' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
