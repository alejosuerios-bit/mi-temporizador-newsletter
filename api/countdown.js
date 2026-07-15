import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';
import path from 'path';

// Registrar fuente local de manera ultra-rápida
try {
  const fontPath = path.join(process.cwd(), 'arial.ttf');
  GlobalFonts.registerFromPath(fontPath, 'Arial');
} catch (err) {
  console.error('Error cargando la fuente:', err);
}

// Función auxiliar para convertir colores HEX de la URL a formato válido CSS
const formatHex = (hex, defaultHex) => {
  if (!hex) return `#${defaultHex}`;
  // Asegurar que tenga el símbolo '#'
  return hex.startsWith('#') ? hex : `#${hex}`;
};

// Traducciones para las etiquetas inferiores
const translations = {
  es: { days: 'DÍAS', hours: 'HORAS', mins: 'MINS', secs: 'SEGS', expired: 'OFERTA FINALIZADA' },
  en: { days: 'DAYS', hours: 'HOURS', mins: 'MINS', secs: 'SECS', expired: 'OFFER EXPIRED' }
};

export default async function handler(req, res) {
  // 1. Capturar parámetros de personalización desde la URL
  const targetTimeStr = req.query.time || '2026-12-31T23:59:59';
  const lang = req.query.lang === 'en' ? 'en' : 'es'; // es por defecto
  
  // Colores personalizables con valores por defecto elegantes (Modo Oscuro minimalista)
  const bg = formatHex(req.query.bg, '121214');          // Fondo general
  const boxBg = formatHex(req.query.boxBg, '202024');      // Fondo de las tarjetas
  const numColor = formatHex(req.query.numColor, 'ffffff'); // Color de los números
  const labelColor = formatHex(req.query.labelColor, '8d8d99'); // Color de las etiquetas
  const borderColor = formatHex(req.query.borderColor, 'ef4444'); // Borde de las tarjetas

  // Cálculo de tiempos
  const targetDate = new Date(targetTimeStr);
  const now = new Date();
  let diffInSeconds = Math.floor((targetDate - now) / 1000);

  // Dimensiones del banner (Tamaño estándar ideal para newsletters)
  const width = 600;
  const height = 130;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- CASO ESPECIAL: SI LA CUENTA ATRÁS YA EXPIRÓ ---
  if (diffInSeconds <= 0) {
    // Dibujamos un banner fijo elegante de "Oferta finalizada"
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Caja de aviso
    ctx.fillStyle = boxBg;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 25, width - 80, height - 50, 8);
    ctx.fill();
    ctx.stroke();

    // Texto de expiración
    ctx.fillStyle = numColor;
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(translations[lang].expired, width / 2, height / 2);

    const expiredBuffer = canvas.toBuffer('image/gif');
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.send(expiredBuffer);
  }

  // --- GENERACIÓN DEL GIF ANIMADO ---
  const framesCount = 10; // 10 segundos de animación
  const encoder = new GIFEncoder(width, height, 'neuquant');
  encoder.setDelay(1000);
  encoder.setRepeat(0);
  encoder.start();

  // Configuración de la cuadrícula de tarjetas
  const boxWidth = 110;
  const boxHeight = 90;
  const gap = 20;
  const totalGridWidth = (boxWidth * 4) + (gap * 3);
  const startX = (width - totalGridWidth) / 2; // Centrado exacto
  const boxY = (height - boxHeight) / 2;

  for (let i = 0; i < framesCount; i++) {
    let currentDiff = diffInSeconds - i;
    if (currentDiff < 0) currentDiff = 0;

    const values = [
      Math.floor(currentDiff / 86400),                  // Días
      Math.floor((currentDiff % 86400) / 3600),          // Horas
      Math.floor((currentDiff % 3600) / 60),            // Minutos
      currentDiff % 60                                  // Segundos
    ];

    const labels = [
      translations[lang].days,
      translations[lang].hours,
      translations[lang].mins,
      translations[lang].secs
    ];

    // Limpiar lienzo con el color de fondo general
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Dibujar las 4 tarjetas
    for (let j = 0; j < 4; j++) {
      const x = startX + j * (boxWidth + gap);

      // Tarjeta con bordes redondeados
      ctx.fillStyle = boxBg;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, boxY, boxWidth, boxHeight, 10); // 10px de radio de curvatura
      ctx.fill();
      ctx.stroke();

      // Número (Centrado verticalmente un poco hacia arriba)
      ctx.fillStyle = numColor;
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const formattedNum = values[j].toString().padStart(2, '0');
      ctx.fillText(formattedNum, x + boxWidth / 2, boxY + boxHeight / 2 - 10);

      // Etiqueta inferior (Días, Horas, etc.)
      ctx.fillStyle = labelColor;
      ctx.font = 'bold 11px Arial';
      ctx.fillText(labels[j], x + boxWidth / 2, boxY + boxHeight / 2 + 24);
    }

    encoder.addFrame(ctx);
  }

  encoder.finish();
  const gifBuffer = encoder.out.getData();

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(gifBuffer);
}
