# VitroCorp EC — sitio web V2

Nueva versión institucional en la rama `feature/vitrocorp-v2`. La rama `main` permanece intacta y sigue sirviendo la web publicada.

## Objetivo
Presentar VitroCorp como iniciativa de biotecnología aplicada, con prioridad comercial en proyectos y contactos B2B, conservando formación y recursos digitales.

## Estructura
- `index.html`: página principal V2.
- `css/styles.css`: estilos responsive.
- `js/main.js`: navegación, año y eventos de interacción.
- `js/catalog.js`: catálogo de ebooks desde Supabase.
- `assets/logo/vitrocorp-logo.svg`: símbolo vectorial conceptual de matraz y planta.
- Páginas legales, enlaces y agradecimiento originales conservados.

## Integraciones
- Catálogo de ebooks: endpoint REST público de Supabase y tabla `ebooks`.
- Combo Starter Biotech: enlace Hotmart existente.
- Contacto: WhatsApp y correo corporativo existentes.

## Pendientes antes de publicar
1. Sustituir ilustraciones conceptuales por fotografías reales y autorizadas del laboratorio.
2. Confirmar el archivo maestro del logotipo y sustituir el SVG conceptual si corresponde.
3. Validar textos de servicios, capacidades, disponibilidad y alianzas.
4. Revisar políticas RLS de Supabase y el catálogo.
5. Actualizar privacidad y términos si se añaden formularios y analítica.
6. Ejecutar Lighthouse, pruebas móviles, accesibilidad y enlaces.
7. Configurar y probar el identificador de Google Analytics.

Sitio estático; no requiere compilación ni dependencias npm.