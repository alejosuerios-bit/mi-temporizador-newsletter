import { createCanvas } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';

export default async function handler(req, res) {
  const targetTimeStr = req.query.time || '2026-12-31T23:59:59';
  const targetDate = new Date(targetTimeStr);
  const now = new Date();

  let diffInSeconds = Math.floor((targetDate - now) / 1000);

  const width = 350;
  const height = 100;
  const framesCount = 10; 

  const encoder = new GIFEncoder(width, height, 'neuquant');
  encoder.setDelay(1000);
  encoder.setRepeat(0);
  encoder.start();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < framesCount; i++) {
    let currentDiff = diffInSeconds - i;
    if (currentDiff < 0) currentDiff = 0;

    const days = Math.floor(currentDiff / 86400);
    const hours = Math.floor((currentDiff % 86400) / 3600);
    const minutes = Math.floor((currentDiff % 3600) / 60);
    const seconds = currentDiff % 60;

    const text = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    encoder.addFrame(ctx);
  }

  encoder.finish();
  const gifBuffer = encoder.out.getData();

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(gifBuffer);
}
