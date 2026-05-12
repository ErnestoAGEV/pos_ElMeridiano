// Script para generar icon.png desde el SVG usando Canvas API de Node
// Se ejecuta con: node scripts/generate-icon.js

import { writeFileSync } from 'fs';

// Crear un PNG minimo de 256x256 con la "M" dorada sobre fondo oscuro
// Usamos un BMP-like approach embebido en PNG

// Para simplificar, creamos el icono directamente con el modulo canvas
// pero como no tenemos canvas instalado, generamos un HTML que el usuario
// puede abrir en el navegador para descargar el PNG

const html = `<!DOCTYPE html>
<html>
<body>
<canvas id="c" width="256" height="256"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');

// Background
ctx.fillStyle = '#0f172a';
const r = 32;
ctx.beginPath();
ctx.moveTo(r, 0);
ctx.lineTo(256-r, 0);
ctx.quadraticCurveTo(256, 0, 256, r);
ctx.lineTo(256, 256-r);
ctx.quadraticCurveTo(256, 256, 256-r, 256);
ctx.lineTo(r, 256);
ctx.quadraticCurveTo(0, 256, 0, 256-r);
ctx.lineTo(0, r);
ctx.quadraticCurveTo(0, 0, r, 0);
ctx.closePath();
ctx.fill();

// Letter M
ctx.fillStyle = '#d4af37';
ctx.font = 'bold 180px serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('M', 128, 138);

// Download
const link = document.createElement('a');
link.download = 'icon.png';
link.href = c.toDataURL('image/png');
link.click();
document.body.innerHTML = '<h1>Icon descargado! Mueve icon.png a public/icons/</h1>';
</script>
</body>
</html>`;

writeFileSync('scripts/generate-icon.html', html);
console.log('Abre scripts/generate-icon.html en tu navegador para generar el icono PNG');
