# Regla Obligatoria: Formateo de Números en Español Venezuela (es-VE)

En todos los proyectos y pantallas de la aplicación, **TODOS** los números mostrados al usuario final deben respetar la convención de Venezuela:
- **Separador de Miles:** Punto (`.`)
- **Separador de Decimales:** Coma (`,`)

### Reglas Críticas:
1. Prohibido usar `.toFixed(2)` directamente en renderizados de la interfaz.
2. Siempre utilizar la utilidad `formatNumberVE`, `formatCurrencyVE` o `Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
3. Esto aplica para montos en dólares `$`, montos en bolívares `Bs.`, tasas de cambio, conteos, subtotales y porcentajes.
