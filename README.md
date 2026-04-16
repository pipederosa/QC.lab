# StabilityQC — Guía de despliegue

Aplicación web de control de estudios de estabilidad GxP.
Archivos estáticos (HTML + CSS + JS). No requiere servidor backend para la demo.

## Estructura de archivos

```
stabilityqc/
├── index.html          ← Página principal
├── css/
│   └── styles.css      ← Estilos
└── js/
    ├── data.js         ← Datos de ejemplo
    └── app.js          ← Lógica de la aplicación
```

---

## OPCIÓN 1 — GitHub Pages (recomendada, 100% gratis)

### Requisitos
- Cuenta en GitHub (gratis en github.com)

### Pasos

1. Crear un repositorio nuevo en github.com
   - Nombre sugerido: `stabilityqc`
   - Visibilidad: Public (necesario para Pages gratis)
   - Sin README inicial

2. Subir los archivos
   - Opción A (web): Arrastrar todos los archivos a la pantalla del repo
   - Opción B (git):
     ```bash
     git init
     git add .
     git commit -m "StabilityQC demo inicial"
     git remote add origin https://github.com/TU_USUARIO/stabilityqc.git
     git push -u origin main
     ```

3. Activar GitHub Pages
   - Ir a Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: main / (root)
   - Guardar

4. URL resultante (disponible en ~2 min):
   ```
   https://TU_USUARIO.github.io/stabilityqc/
   ```

### Tiempo estimado: 10 minutos

---

## OPCIÓN 2 — Netlify Drop (más rápido, sin cuenta necesaria)

### Pasos

1. Crear una carpeta `stabilityqc` con todos los archivos
   (respetando la estructura: index.html, css/, js/)

2. Ir a https://app.netlify.com/drop

3. Arrastrar la carpeta completa al área de drop de la página

4. Netlify genera una URL aleatoria inmediatamente:
   ```
   https://nombre-aleatorio-123.netlify.app
   ```

5. (Opcional) Cambiar la URL en Site settings → General → Site name

### Tiempo estimado: 2 minutos
### Con cuenta gratis: URL personalizable, HTTPS automático, sin límite de tiempo

---

## OPCIÓN 3 — Vercel (más profesional, gratis)

### Requisitos
- Cuenta en vercel.com (gratis, se puede registrar con GitHub)

### Opción A — Desde CLI

```bash
npm install -g vercel   # instalar una sola vez
vercel                  # dentro de la carpeta del proyecto
```

Seguir el asistente:
- Set up and deploy: Y
- Project name: stabilityqc
- Directory: ./
- Override settings: N

URL resultante:
```
https://stabilityqc.vercel.app
```

### Opción B — Desde GitHub

1. Subir el proyecto a un repo de GitHub (ver Opción 1, pasos 1-2)
2. Ir a vercel.com → New Project → Import desde GitHub
3. Seleccionar el repo → Deploy

### Tiempo estimado: 5 minutos

---

## OPCIÓN 4 — Cloudflare Pages (gratis, con CDN global)

### Pasos

1. Subir el proyecto a GitHub (ver Opción 1, pasos 1-2)

2. Ir a dash.cloudflare.com → Pages → Create a project

3. Conectar con GitHub → Seleccionar el repo

4. Build settings:
   - Framework preset: None
   - Build command: (dejar vacío)
   - Build output directory: /

5. Save and Deploy

URL resultante:
```
https://stabilityqc.pages.dev
```

### Tiempo estimado: 10 minutos
### Ventaja: CDN global gratuito, ideal si el equipo está en varias ubicaciones

---

## OPCIÓN 5 — Servidor local (para pruebas internas sin internet)

### Opción A — Python (ya instalado en Mac/Linux)

```bash
# Dentro de la carpeta stabilityqc:
python3 -m http.server 8080
```
Abrir en el navegador: http://localhost:8080

### Opción B — Node.js

```bash
npx serve .
```
O con live-reload:
```bash
npx live-server
```

### Opción C — Extensión VS Code

Instalar "Live Server" en VS Code → clic derecho en index.html → "Open with Live Server"

---

## Comparación de opciones

| Opción          | Tiempo | Cuenta | URL personalizable | HTTPS | CDN |
|-----------------|--------|--------|--------------------|-------|-----|
| GitHub Pages    | 10 min | Sí     | Sí (con dominio)   | Sí    | Sí  |
| Netlify Drop    | 2 min  | No*    | No*                | Sí    | Sí  |
| Vercel          | 5 min  | Sí     | Sí                 | Sí    | Sí  |
| Cloudflare Pages| 10 min | Sí     | Sí                 | Sí    | Sí  |
| Local           | 1 min  | No     | No                 | No    | No  |

*Con cuenta gratis de Netlify: URL personalizable y sin límite de tiempo

---

## Pasar a producción (con backend real)

Para conectar con una API real, editar js/app.js:

1. Reemplazar el array STUDIES por llamadas fetch():
```javascript
// Cambiar:
const STUDIES = [ /* datos hardcodeados */ ];

// Por:
async function loadStudies() {
  const res = await fetch('https://tu-api.com/api/studies');
  return res.json();
}
```

2. Backend sugerido: FastAPI (Python) o NestJS (Node.js)
3. Base de datos: PostgreSQL
4. Hosting backend gratuito: Railway.app o Render.com (plan gratuito)

---

## Notas de seguridad para producción

- Implementar autenticación JWT antes de exponer datos reales
- Configurar CORS en el backend
- Usar variables de entorno para URLs de API
- Habilitar HTTPS (automático en todas las opciones de hosting listadas)
- Revisar permisos de roles antes de ir a producción GxP
