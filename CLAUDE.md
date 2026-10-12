# CLAUDE.md — MetaMAP

## Stack y comandos
- (completar: stack, dev, test, build)

<!-- agent-kit:start -->
## Seguridad
- Nunca leer, imprimir ni pegar `.env*`, llaves, tokens, dumps de BD ni datos reales de clientes. Usa `.env.example` como referencia de variables.
- Comandos destructivos (`rm -rf`, `git push --force`, migraciones, SQL en producción, deploys a prod) requieren confirmación explícita de Henry.
- Supabase/Vercel: solo branches y previews desde el agente. Producción la ejecuta Henry.

## Git
- Sin atribución de IA en commits, PRs ni issues (nada de `Co-Authored-By` ni "Generated with").
- Commits en el idioma del historial del repo. Staging por rutas explícitas; nunca `git add -A`.
- Una sesión = una tarea = una rama/PR. `/clear` entre tareas.

## Documentación
- `CONTEXT.md`: glosario del dominio. Usa esos términos en código, commits y respuestas. Si aparece un término nuevo, agrégalo.
- `ESTADO.md`: estado de la tarea actual. **Al terminar cada sesión (o con `/handoff`), actualiza Hecho / Pendiente / Bloqueado / Siguiente paso.**
- `docs/adr/`: una ADR por decisión de arquitectura o producto que costó tomar. Plantilla en `docs/adr/0000-plantilla.md`.
- `CHANGELOG.md`: una línea por cambio entregado, bajo "Sin publicar".

## Cómo trabajar
- Lee `ESTADO.md` y `CONTEXT.md` antes de empezar.
- Cambios no triviales: alinear primero (`/grill-with-docs` o preguntas), luego spec, luego implementar con tests.
- Antes de proponer una librería nueva, revisa si ya hay algo equivalente en el repo.
<!-- agent-kit:end -->
