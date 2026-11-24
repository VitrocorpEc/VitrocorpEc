# VitroCorp Academy — Diseño de calificación automática

Estado: propuesta técnica para revisión en rama de trabajo. No desplegada. No modifica la base de datos.

## Objetivo

Calificar automáticamente las evaluaciones de estudiantes, con reglas deterministas para preguntas objetivas y evaluación semántica mediante IA para preguntas abiertas.

## Hallazgos verificados

- `lesson_assessments` define título, instrucciones, puntuación máxima y publicación.
- `assessment_questions` contiene `question_type`, `options`, `points` y orden.
- `assessment_answer_keys` guarda `expected_answer` y `teacher_notes`; las claves deben permanecer privadas.
- `assessment_attempts` guarda respuestas JSON, puntuación, estado y retroalimentación.
- El flujo actual inserta respuestas desde el navegador y el docente asigna manualmente una nota.
- La evaluación publicada de prueba tiene tres preguntas `open_text`, cada una de 1 punto, y máximo 3 puntos.

## Flujo propuesto

1. El estudiante envía sus respuestas a una Edge Function autenticada.
2. La función valida sesión, propiedad de la evaluación, estado publicado, intento y estructura de respuestas.
3. Recupera preguntas y claves desde el servidor. Nunca devuelve claves al navegador del estudiante.
4. Para `multiple_choice` y `true_false`, compara identificadores/opciones normalizados y asigna puntos sin IA.
5. Para `open_text`, envía a un proveedor de IA solo pregunta, respuesta, clave esperada, notas/rúbrica y puntos máximos. No enviar nombre, correo ni otros datos personales.
6. La IA devuelve JSON estructurado: puntuación por pregunta, explicación breve y nivel de confianza.
7. El servidor valida el JSON, limita cada puntuación entre 0 y los puntos máximos y verifica que la suma no supere `max_score`.
8. Si falta clave/rúbrica, la respuesta está vacía, el proveedor falla o la confianza es baja, el intento queda pendiente de revisión humana; nunca se inventa una nota.
9. Si todo pasa validación, guarda puntuación, retroalimentación, estado y fecha de revisión mediante una operación protegida del servidor.
10. El estudiante ve únicamente su resultado y la retroalimentación publicada.

## Reglas de seguridad

- No incluir claves de IA, service-role ni secretos en `academy.html`.
- No confiar en puntuaciones enviadas por el navegador.
- No exponer `assessment_answer_keys` a estudiantes.
- La función debe validar el JWT y comprobar el rol administrativo cuando corresponda.
- Evitar que una misma entrega se califique dos veces o que un estudiante reemplace una entrega ya calificada.
- Registrar método/modelo y resultado técnico para auditoría, sin guardar datos personales innecesarios.
- No habilitar emisión de certificados ni aprobación de cursos como efecto automático de esta función.

## Decisiones pendientes antes de conectar IA

- Elegir proveedor/modelo y fijar un límite de gasto mensual.
- Definir rúbricas docentes claras para cada pregunta abierta. La clave actual sirve como referencia, pero no es una rúbrica completa.
- Definir umbral de confianza y política de revisión manual.
- Confirmar si el resultado se publica inmediatamente o requiere confirmación docente durante la fase inicial.

## Plan de pruebas aisladas

- Respuesta correcta, parcialmente correcta, incorrecta y vacía.
- Respuestas equivalentes expresadas con otras palabras.
- Respuesta fuera de tema e intento de prompt injection.
- Puntuaciones negativas, excesivas, formato JSON inválido y proveedor no disponible.
- Usuario no autenticado, estudiante intentando calificar, evaluación no publicada y entrega duplicada.
- Confirmar que la clave nunca aparece en la respuesta HTTP al estudiante.

## Estado

Este documento es únicamente diseño. No se ha creado ni desplegado una Edge Function, no se ha modificado el esquema y no se han escrito datos en Supabase.
