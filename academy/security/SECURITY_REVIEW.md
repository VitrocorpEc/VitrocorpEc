# VitroCorp Academy — preparación de correcciones de seguridad

Estado: **preparación únicamente**. Ningún archivo de esta carpeta se ha aplicado a Supabase ni desplegado como Edge Function.

## Hallazgos confirmados

1. `public.courses`: la política `Students can view their enrolled courses` comprueba que exista una matrícula del usuario, pero no exige `status = 'active'` ni que el curso esté publicado. La política pública ya permite consultar metadatos de cursos publicados; los controles de módulos y lecciones protegidas son independientes.
2. Certificados: el valor por defecto actual genera `VC-` más 12 caracteres hexadecimales (48 bits). La consulta pública se realiza directamente desde el navegador mediante RPC y no tiene limitación de intentos.
3. Funciones SECURITY DEFINER: las cinco funciones revisadas contienen controles de autorización/propiedad adecuados para sus operaciones actuales. La función pública de verificación es intencionalmente accesible sin iniciar sesión. No se propone revocar permisos a ciegas.
4. Tablas privadas `private.academy_payment_settings` y `private.enrollment_admin_actions`: RLS está habilitado y no hay políticas. El esquema privado no es accesible a `anon`; `authenticated` sí tiene USAGE del esquema. Hace falta una comprobación específica de grants antes de decidir cambios.

## Archivos preparados

- `courses_select_policy_hardening.sql`: reemplaza solo la política de lectura de cursos de estudiantes, manteniendo la política de administración y la de catálogo público.
- `certificate_verification_rate_limit.sql`: cambia el generador por defecto de nuevos códigos a 128 bits y prepara una tabla privada más una función RPC exclusiva para service_role, para aplicar 20 verificaciones por IP hash en 10 minutos.
- `verify-academy-certificate/index.ts`: Edge Function pública con CORS limitado a los dominios Academy conocidos, validación de entrada, límite de intentos persistente y respuesta sin caché. Requiere secretos de entorno `SUPABASE_SERVICE_ROLE_KEY` y `CERT_RATE_LIMIT_SALT`.

## Cambios deliberadamente NO realizados

- No se modificó `academy.html`; la verificación del navegador sigue usando el RPC directo hasta que la Edge Function esté desplegada y probada. Cambiar el frontend antes dejaría el verificador sin servicio.
- No se aplicó SQL ni se desplegó una Edge Function.
- No se alteraron matrículas, cursos, certificados existentes, ni permisos de las funciones administrativas.
- No se creó ningún cron, servicio ni recurso de pago.

## Secuencia de aplicación propuesta (requiere autorización separada)

1. Confirmar que los encabezados de IP que expone el gateway de Supabase son confiables en el entorno del proyecto; si no, usar una fuente de IP verificada antes de activar el límite.
2. Respaldar/revisar las políticas y el esquema actual. Aplicar los dos scripts SQL en una ventana aprobada: ambos afectan la base compartida Preview/Producción.
3. Configurar los dos secretos de la Edge Function y desplegarla con JWT verificado desactivado solo porque la verificación pública no requiere cuenta; la función aplica sus propios controles y usa service role internamente.
4. Probar la Edge Function con códigos válidos antiguos, códigos nuevos, códigos inexistentes, origen permitido/no permitido y exceso de intentos.
5. Solo después, cambiar el cliente en `academy.html` de `supabase.rpc('verify_academy_certificate', ...)` a `supabase.functions.invoke('verify-academy-certificate', { body: { code } })`; actualizar lectura de respuesta a `data.certificate`.
6. Probar inscripción, aprobación de transferencia, consulta de cursos, emisión y verificación de certificados. Revertir si falla cualquier operación crítica.

## Riesgos y límites

- No hay un proyecto Supabase de staging separado. Aplicar SQL afectará Preview y Producción a la vez.
- Los certificados existentes conservan sus códigos de 48 bits; el cambio del DEFAULT solo fortalece los nuevos. Para sustituir códigos antiguos habría que planificar una migración de certificados y reemisión individual, no incluida aquí.
- El límite por IP puede afectar a usuarios detrás de una misma red; 20 intentos/10 minutos es un valor inicial conservador que debe validarse.
- La tabla de intentos necesita limpieza periódica aprobada para evitar crecimiento indefinido.
- La limitación por IP no sustituye controles antiabuso adicionales ni garantiza protección frente a redes distribuidas.
