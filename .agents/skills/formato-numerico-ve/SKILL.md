---
name: formato-numerico-ve
description: Regla y estándar obligatorio para formatear números, divisas y porcentajes en Español Venezuela (es-VE) con separador de miles (.) y decimales (,).
---

# Estándar de Formateo Numérico (Español Venezuela - es-VE)

En todas las aplicaciones, pantallas, reportes, tablas y componentes visuales desarrollados, **TODOS los valores numéricos, montos y porcentajes deben formatearse estrictamente bajo el estándar venezolano (es-VE)**:

- **Separador de Miles:** Punto (`.`)
- **Separador de Decimales:** Coma (`,`)
- **Ejemplo Numérico:** `1.234.567,89` (NUNCA `1,234,567.89`)
- **Ejemplo Dólares:** `$ 1.250,00`
- **Ejemplo Bolívares:** `Bs. 85.340,50`
- **Ejemplo Porcentajes:** `16,0%` o `25,5%`

---

## 🚫 Prácticas Prohibidas
- **NUNCA** usar `.toFixed(2)` directamente dentro del JSX o HTML para mostrar cantidades al usuario final (ej. `<div>${monto.toFixed(2)}</div>` es **INCORRECTO** porque genera formato anglosajón `1234.56`).
- **NUNCA** usar separador de miles con coma (`,`) ni decimal con punto (`.`).

---

## ✅ Implementación Estándar Recomendada

### 1. Utilidad Universal en `lib/format.ts` o equivalente:
```typescript
/**
 * Formateador de números en estándar venezolano es-VE
 */
export function formatNumberVE(val: any, decimals: number = 2): string {
  const num = Number(val);
  if (isNaN(num)) return '0,' + '0'.repeat(decimals);
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formateador de moneda en estándar venezolano es-VE
 */
export function formatCurrencyVE(val: any, isDivisaOrSymbol: boolean | string = true): string {
  const prefix = typeof isDivisaOrSymbol === 'string' 
    ? `${isDivisaOrSymbol} ` 
    : isDivisaOrSymbol ? '$ ' : 'Bs. ';
  return `${prefix}${formatNumberVE(val, 2)}`;
}

/**
 * Formateador de porcentaje en estándar venezolano es-VE
 */
export function formatPercentVE(val: any, decimals: number = 1): string {
  const num = Number(val);
  if (isNaN(num)) return '0%';
  return `${formatNumberVE(num, decimals)}%`;
}
```

### 2. Uso en Componentes React / Vue / Vanilla:
```tsx
import { formatCurrencyVE, formatNumberVE, formatPercentVE } from "@/lib/format";

// En JSX:
<div>{formatCurrencyVE(totalUsd, true)}</div>        {/* Muestra: $ 1.250,00 */}
<div>{formatCurrencyVE(totalBs, false)}</div>        {/* Muestra: Bs. 85.340,50 */}
<div>{formatPercentVE(margenNeto)}</div>            {/* Muestra: 18,5% */}
<div>{formatNumberVE(tasaCambio, 4)}</div>          {/* Muestra: 36,4500 */}
```
