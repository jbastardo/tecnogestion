/**
 * Utilidades de formateo numérico para Venezuela (es-VE)
 * Norma general:
 * - Separador de miles: punto (.)
 * - Separador de decimales: coma (,)
 * - Monedas: '$ 1.250,00' o 'Bs. 85.340,50'
 */

const formatterCache = new Map<number, Intl.NumberFormat>();

function getFormatter(decimals: number): Intl.NumberFormat {
  if (!formatterCache.has(decimals)) {
    formatterCache.set(
      decimals,
      new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  }
  return formatterCache.get(decimals)!;
}

/**
 * Formatea un número puro en estándar es-VE (ej. 1.234.567,89)
 */
export function formatNumberVE(val: any, decimals: number = 2): string {
  if (val === null || val === undefined || val === '') return getFormatter(decimals).format(0);
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return getFormatter(decimals).format(0);
  return getFormatter(decimals).format(num);
}

/**
 * Formatea una cifra con su respectivo símbolo de moneda ($ o Bs.)
 * @param val Valor numérico o string numérico
 * @param isDivisa Si es true/'USD'/'$' antepone '$ ', si es false/'BS'/'VES' antepone 'Bs. '
 * @param decimals Cantidad de decimales (por defecto 2)
 */
export function formatCurrencyVE(
  val: any,
  isDivisa: boolean | 'USD' | 'BS' | string = true,
  decimals: number = 2
): string {
  const isUsd = typeof isDivisa === 'boolean' 
    ? isDivisa 
    : String(isDivisa).toUpperCase().includes('USD') || String(isDivisa).includes('$');
  const symbol = isUsd ? '$ ' : 'Bs. ';
  return `${symbol}${formatNumberVE(val, decimals)}`;
}

/**
 * Formatea un porcentaje con estándar es-VE (ej. 20,5%)
 */
export function formatPercentVE(val: any, decimals: number = 1): string {
  return `${formatNumberVE(val, decimals)}%`;
}
