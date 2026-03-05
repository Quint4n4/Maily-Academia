/** Países con bandera (emoji) para el registro */
export const COUNTRIES = [
  { id: 'MX', name: 'México', flag: '🇲🇽' },
  { id: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { id: 'PE', name: 'Perú', flag: '🇵🇪' },
  { id: 'CL', name: 'Chile', flag: '🇨🇱' },
  { id: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { id: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { id: 'ES', name: 'España', flag: '🇪🇸' },
  { id: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { id: 'OTRO', name: 'Otro', flag: '🌐' },
];

/** Estados o provincias por país (id del país) */
export const STATES_BY_COUNTRY = {
  MX: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
    'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
    'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
    'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
  ],
  CO: [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas',
    'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
    'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
    'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
  ],
  PE: [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco',
    'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto',
    'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
  ],
  CL: [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
    'Metropolitana de Santiago', 'Libertador G. B. O\'Higgins', 'Maule', 'Ñuble', 'Biobío',
    'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes y Antártica Chilena',
  ],
  AR: [
    'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
    'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
    'Tierra del Fuego', 'Tucumán',
  ],
  EC: [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas',
    'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo',
    'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos',
    'Tungurahua', 'Zamora Chinchipe',
  ],
  ES: [
    'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria', 'Castilla-La Mancha',
    'Castilla y León', 'Cataluña', 'Ceuta', 'Comunidad Valenciana', 'Extremadura', 'Galicia',
    'Madrid', 'Melilla', 'Murcia', 'Navarra', 'País Vasco', 'La Rioja',
  ],
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming', 'District of Columbia',
  ],
  OTRO: [],
};

/** Ciudades principales por país y estado. key: `${countryId}-${stateName}` */
export const CITIES_BY_COUNTRY_STATE = {
  'MX-Ciudad de México': ['Ciudad de México', 'Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac', 'Tlalpan', 'Xochimilco'],
  'MX-Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Lagos de Moreno', 'El Salto', 'Ocotlán'],
  'MX-Nuevo León': ['Monterrey', 'San Nicolás de los Garza', 'Guadalupe', 'San Pedro Garza García', 'Santa Catarina', 'Apodaca', 'General Escobedo'],
  'MX-Puebla': ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco', 'Huauchinango', 'Izúcar de Matamoros'],
  'MX-Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Córdoba', 'Poza Rica', 'Orizaba', 'Minatitlán'],
  'MX-Estado de México': ['Toluca', 'Naucalpan', 'Ecatepec', 'Nezahualcóyotl', 'Tlalnepantla', 'Cuautitlán Izcalli', 'Chimalhuacán', 'Atizapán de Zaragoza'],
  'CO-Bogotá D.C.': ['Bogotá'],
  'CO-Antioquia': ['Medellín', 'Bello', 'Envigado', 'Itagüí', 'Sabaneta', 'Rionegro'],
  'CO-Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga'],
  'CO-Cundinamarca': ['Soacha', 'Fusagasugá', 'Girardot', 'Facatativá', 'Zipaquirá'],
  'PE-Lima': ['Lima', 'Callao', 'Huacho', 'Huaral', 'Barranca', 'Cañete'],
  'PE-Arequipa': ['Arequipa', 'Camaná', 'Mollendo', 'Chivay'],
  'PE-Cusco': ['Cusco', 'Quillabamba', 'Sicuani', 'Urubamba'],
  'CL-Metropolitana de Santiago': ['Santiago', 'Puente Alto', 'Maipú', 'La Florida', 'San Bernardo', 'Peñalolén', 'Vitacura', 'Las Condes'],
  'CL-Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio'],
  'CL-Biobío': ['Concepción', 'Talcahuano', 'Chiguayante', 'Los Ángeles', 'Coronel'],
  'AR-Ciudad Autónoma de Buenos Aires': ['Buenos Aires'],
  'AR-Buenos Aires': ['La Plata', 'Mar del Plata', 'Bahía Blanca', 'Quilmes', 'Lanús', 'Lomas de Zamora'],
  'AR-Córdoba': ['Córdoba', 'Villa María', 'Río Cuarto', 'Alta Gracia', 'Villa Carlos Paz'],
  'AR-Santa Fe': ['Rosario', 'Santa Fe', 'Rafaela', 'Venado Tuerto', 'Reconquista'],
  'EC-Pichincha': ['Quito', 'Cayambe', 'Machachi', 'Sangolquí'],
  'EC-Guayas': ['Guayaquil', 'Durán', 'Samborondón', 'Milagro', 'Daule'],
  'ES-Madrid': ['Madrid', 'Alcalá de Henares', 'Getafe', 'Leganés', 'Móstoles', 'Alcorcón'],
  'ES-Cataluña': ['Barcelona', 'Hospitalet de Llobregat', 'Badalona', 'Terrassa', 'Sabadell', 'Lleida', 'Tarragona'],
  'US-California': ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach'],
  'US-Texas': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso'],
  'US-Florida': ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah'],
  'US-New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany'],
};

/** Obtener ciudades para un país y estado. Si no hay lista, devolver array vacío (el usuario puede escribir en "Otro"). */
export function getCities(countryId, stateName) {
  if (!countryId || !stateName) return [];
  const key = `${countryId}-${stateName}`;
  return CITIES_BY_COUNTRY_STATE[key] || [];
}
