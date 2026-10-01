---
name: coolify-github-webhooks-mastery
description: Guía definitiva paso a paso para configurar webhooks de GitHub en Coolify v4 y solucionar el fallo de despliegue automático.
---

# Maestría en Webhooks: GitHub + Coolify v4

Si los webhooks devuelven `HTTP 200 OK` en GitHub pero el despliegue no arranca y aparece como `Manual`, existe un desajuste entre la URL reportada por el webhook y la registrada internamente en la base de datos de Coolify.

Existen dos escenarios de integración con GitHub. Sigue la regla correspondiente a tu caso:

## Escenario A: Repositorios Públicos (Manual Git Webhooks)

Cuando añades una aplicación en Coolify a través del método "Public Repository", Coolify utiliza un webhook manual.

**El Problema:**
Al enviar el evento, GitHub reporta el repositorio como `https://github.com/usuario/repo`. Coolify compara esta URL **de forma estricta** contra la propiedad `git_repository` de la aplicación. Si cuando creaste el proyecto escribiste `usuario/repo`, `git@github.com...` o `https://github.com/usuario/repo.git` (con `.git`), el webhook es ignorado silenciosamente.

**La Solución Infalible:**
1. En GitHub, ve a *Settings > Webhooks*. La URL debe ser `https://<tu-dominio-coolify>/webhooks/source/github/events/manual`. Content-type: `application/json`.
2. A nivel de Coolify, debes asegurarte (vía la UI o parcheando por la API) que la "Repository URL" sea **exactamente** la versión HTTPS sin `.git` al final. Ejemplo: `https://github.com/usuario/repo`.
3. La "Branch" debe coincidir perfectamente (por ej: `main`).
4. Si Coolify generó un "Webhook Secret" en la sección *Manual Git webhooks*, debes copiar ese mismo secreto y pegarlo en el campo *Secret* del webhook en GitHub.

---

## Escenario B: Integración Privada (GitHub App)

Si vinculaste la aplicación usando la integración oficial de Coolify ("Private Repository with GitHub App"), el flujo es diferente. 

**El Problema:**
Coolify guarda internamente el nombre del repositorio solo como `usuario/repo`. **NO** uses el webhook "Manual" descrito en el Escenario A. Si intentas agregar un webhook manual en los settings de ese repositorio en GitHub, Coolify lo va a rechazar (por el desajuste `usuario/repo` vs `https://...`).

**La Solución Infalible:**
1. **NO agregues webhooks individuales** en el repositorio.
2. Ve a los ajustes globales de tu cuenta u organización de GitHub: **Settings > Developer Settings > GitHub Apps**.
3. Selecciona la aplicación de Coolify que autorizaste.
4. En la sección **Webhook**, verifica que la URL global esté correctamente configurada como: `https://<tu-dominio-coolify>/webhooks/github/events` (Nota que es un endpoint diferente al manual).
5. Verifica que los permisos de la GitHub App incluyan *Read & Write* para eventos de *Push*.

### Resumen de Troubleshooting para Agentes
Si el usuario reporta que el webhook no funciona en un entorno Github App:
1. Verifica si intentó configurar webhooks locales por repo. Bórralos.
2. Usa la API de Coolify para validar el formato de `git_repository`. Si está como `App\Models\GithubApp`, no uses el webhook manual. Si realmente necesitan forzar el webhook manual, actualiza la propiedad `git_repository` vía API (`PATCH /api/v1/applications/{uuid}`) para que sea `https://github.com/usuario/repo`.
3. Para despliegues garantizados desde un flujo CI/CD externo, utiliza el token de la API (alojado en `secret-vault`) y llama a `POST /api/v1/deploy?uuid=<uuid>`.
