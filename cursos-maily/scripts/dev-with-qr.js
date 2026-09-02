import { networkInterfaces } from 'os';
import qrcode from 'qrcode-terminal';

const getLocalIP = () => {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const port = process.env.PORT || 5173;
const ip = getLocalIP();
const url = `http://${ip}:${port}`;

console.log('\n🚀 Servidor de desarrollo iniciado!\n');
console.log(`📍 URL local: ${url}\n`);
console.log('📱 Escanea este código QR con tu móvil:\n');

qrcode.generate(url, { small: true }, (qr) => {
  console.log(qr);
  console.log(`\n💡 Asegúrate de que tu móvil esté en la misma red WiFi\n`);
  console.log(`🌐 También puedes acceder directamente desde: ${url}\n`);
});

