import { networkInterfaces } from 'os';
import qrcode from 'qrcode-terminal';

const getLocalIP = () => {
  const interfaces = networkInterfaces();
  const ipAddresses = [];
  
  // Interfaces a ignorar completamente (virtuales, WSL, etc.)
  const ignoredInterfaces = ['vEthernet', 'WSL', 'Hyper-V', 'VirtualBox', 'VMware', 'Bluetooth'];
  
  // Rangos de IP a ignorar (virtualización)
  const ignoredRanges = ['172.18.', '172.19.', '172.20.', '192.168.56.', '169.254.'];
  
  for (const name of Object.keys(interfaces)) {
    // Ignorar interfaces virtuales por nombre
    if (ignoredInterfaces.some(ignored => name.includes(ignored))) {
      continue;
    }
    
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const addr = iface.address;
        
        // Ignorar rangos de virtualización
        if (ignoredRanges.some(range => addr.startsWith(range))) {
          continue;
        }
        
        // Determinar prioridad
        const nameLower = name.toLowerCase();
        let priority = 0;
        
        // Máxima prioridad: WiFi
        if (nameLower.includes('wi-fi') || nameLower.includes('wifi') || nameLower.includes('wlan')) {
          priority = 3;
        }
        // Alta prioridad: Ethernet real (pero no si tiene números que sugieren virtual)
        else if (nameLower.includes('ethernet') && !/\d/.test(name.replace('Ethernet', '').trim())) {
          priority = 2;
        }
        // Prioridad media: otras interfaces
        else if (!nameLower.includes('virtual') && !nameLower.includes('vm')) {
          priority = 1;
        }
        
        ipAddresses.push({
          address: addr,
          name: name,
          priority: priority
        });
      }
    }
  }
  
  // Ordenar por prioridad (mayor primero)
  ipAddresses.sort((a, b) => b.priority - a.priority);
  
  // Devolver la IP con mayor prioridad
  if (ipAddresses.length > 0) {
    return ipAddresses[0].address;
  }
  
  return 'localhost';
};

export default function vitePluginQR() {
  return {
    name: 'vite-plugin-qr',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        const port = typeof address === 'object' ? address?.port : 5173;
        const ip = getLocalIP();
        const url = `http://${ip}:${port}`;

        setTimeout(() => {
          console.log('\n🚀 Servidor de desarrollo iniciado!\n');
          console.log(`📍 URL local: ${url}\n`);
          console.log('📱 Escanea este código QR con tu móvil:\n');

          qrcode.generate(url, { small: true }, (qr) => {
            console.log(qr);
            console.log(`\n💡 Asegúrate de que tu móvil esté en la misma red WiFi\n`);
            console.log(`🌐 También puedes acceder directamente desde: ${url}\n`);
          });
        }, 500);
      });
    },
  };
}

