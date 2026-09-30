---
name: coolify-github-webhook-fix
description: Procedimiento infalible para configurar Webhooks entre GitHub y Coolify cuando fallan los despliegues automáticos.
---

# Activación Correcta de Webhooks en Coolify + GitHub

Cuando los webhooks de GitHub hacia Coolify retornan HTTP 200 OK pero **NO se dispara el despliegue automático**, se debe a una falla de validación en la URL global de Git Source en Coolify. Y si intentas usar la API `/api/v1/deploy`, obtendrás un Error 401 porque GitHub no puede enviar headers `Bearer Token`.

Para resolver definitivamente el problema de Webhooks de GitHub hacia Coolify, debes asegurarte de que se cumplan estas 3 reglas de oro en la configuración del Source en Coolify:

### Instrucciones para el Agente (Resolución Definitiva)

1. **La Rama (Branch) debe coincidir exactamente:**
   Verifica que la rama configurada en la aplicación en Coolify (ej. `main`) sea exactamente la misma rama a la que estás haciendo el *push* en GitHub. A veces Coolify pone `master` por defecto y GitHub usa `main`.

2. **La URL del Repositorio debe coincidir (¡Crítico!):**
   El webhook de GitHub envía el formato HTTPS (`https://github.com/usuario/repo`). 
   Si el usuario configuró el repositorio en Coolify usando el formato SSH (`git@github.com:usuario/repo.git`), Coolify no reconocerá el webhook y lo ignorará silenciosamente (HTTP 200 OK pero sin deploy).
   **Solución:** Pide al usuario que en Coolify, en la configuración de la aplicación, el "Repository URL" esté en formato HTTPS si es un repo público, o que coincida exactamente con el evento de GitHub.

3. **El Secreto del Webhook (Webhook Secret):**
   Si en la configuración del Source en Coolify hay un "Webhook Secret" generado, ese secreto **TIENE** que estar configurado en el Webhook de GitHub (en el campo Secret) para que GitHub envíe el header `X-Hub-Signature-256`.
   **Solución rápida:** Pídele al usuario que borre el Webhook Secret en Coolify (dejarlo en blanco) si es un proyecto no crítico, o pídele que te dé el Secret para inyectarlo en GitHub.

### Configuración del Webhook a inyectar
Sabiendo lo anterior, la URL correcta a inyectar en GitHub mediante la API REST (usando el PAT de `secret-vault`) debe ser SIEMPRE la del Git Source:
`https://<dominio-coolify>/webhooks/source/github/events/manual`
(Asegúrate de no usar IPs bloqueadas o sin SSL si el dominio está disponible).

Si explicas estas 3 reglas al usuario, el webhook global funcionará al 100%.
