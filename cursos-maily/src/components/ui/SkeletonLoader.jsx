/**
 * SkeletonLoader — Componente reutilizable para estados de carga.
 * Usa animación pulse de Tailwind para indicar que el contenido está cargando.
 */

// Componente base
const SkeletonLoader = ({
  className = '',
  width,
  height,
  rounded = false,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';
  const roundedClass = rounded ? 'rounded-full' : 'rounded-lg';

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${roundedClass} h-4`}
            style={{
              width: i === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${roundedClass} ${className}`}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
    />
  );
};

// Tarjeta skeleton — para grids de cursos y estadísticas
export const SkeletonCard = ({ className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm ${className}`}
  >
    {/* Thumbnail */}
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-44 w-full" />
    {/* Contenido */}
    <div className="p-5 space-y-3">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-5 w-3/4" />
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-4 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-4 w-16" />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-4 w-12" />
      </div>
    </div>
  </div>
);

// Texto skeleton — para párrafos y líneas de texto
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <SkeletonLoader lines={lines} className={className} />
);

// Avatar skeleton — para fotos de perfil o iconos circulares
export const SkeletonAvatar = ({ size = 40, className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 ${className}`}
    style={{ width: size, height: size }}
  />
);

// Botón skeleton — para botones en estado de carga
export const SkeletonButton = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-10 w-28 ${className}`}
  />
);

// Fila de tabla skeleton — para listas/tablas de datos
export const SkeletonTableRow = ({ cols = 4, className = '' }) => (
  <div className={`flex items-center gap-4 py-4 border-b border-gray-100 dark:border-gray-700 ${className}`}>
    <SkeletonAvatar size={36} />
    <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols - 1}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-4"
          style={{ width: i === cols - 2 ? '60%' : '100%' }}
        />
      ))}
    </div>
  </div>
);

// Skeleton para estadísticas del dashboard
export const SkeletonStatCard = ({ className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 ${className}`}
  >
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-12 w-12" />
    <div className="space-y-2">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-8 w-16" />
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-3 w-24" />
    </div>
  </div>
);

export default SkeletonLoader;
