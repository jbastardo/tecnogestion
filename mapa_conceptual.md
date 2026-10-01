# Mapa Conceptual de TecnoGestión (Guía Funcional y Arquitectura)

Este documento refleja cómo la aplicación está estructurada lógicamente, dividiendo las responsabilidades entre **Odoo** (nuestra fuente de la verdad para la facturación/compras principales) y la **Base de Datos Local Postgres (Prisma)** (nuestro motor para el presupuesto, órdenes de pago y operaciones diarias).

## Arquitectura General y Tecnologías Clave

* **Frontend y Backend Híbrido:** Next.js 14 (App Router) + React + TypeScript + TailwindCSS.
* **Integración Odoo:** Conexión en tiempo real vía `XML-RPC` para consultar información oficial y auditar movimientos financieros.
* **Base de Datos Local:** PostgreSQL gestionado vía Prisma ORM.
* **Despliegue e Infraestructura (CI/CD):** Hospedado en Coolify, integrado vía GitHub Webhooks para actualizaciones automáticas en la rama `main`.

```mermaid
graph TD
    A[TecnoGestión Web App (Next.js)]
    
    subgraph "Fuente de Verdad (Lectura en Tiempo Real)"
    Odoo[(Odoo Server SH)]
    end
    
    subgraph "Operaciones Diarias (PostgreSQL en Coolify)"
    LocalDB[(Base de Datos Local / Prisma)]
    end

    %% Conexiones desde Odoo
    Odoo -->|Facturas, Notas y Pagos POS| Ingresos(Módulo: Ingresos)
    Odoo -->|Facturas y Notas de Proveedor| Compras(Módulo: Compras)
    Odoo -.->|Cálculo Global| Dash(Dashboard Resumen)

    %% Conexiones desde LocalDB
    LocalDB <-->|Registro y Control Presupuestario| CxP(Gastos CXP)
    LocalDB <-->|Órdenes de Pago| Tesoreria(Módulo: Tesorería)
    LocalDB <-->|Control de Efectivo y Bancos| CajaBancos(Módulo: Caja & Bancos)
    LocalDB -.->|Cálculo Global| Dash

    %% Enlaces
    Ingresos --- Dash
    Compras --- Dash
    CxP --- Tesoreria
    Tesoreria --- CajaBancos
```

---

## Características de Interfaz (UX/UI Globales)

El desarrollo cuenta con implementaciones transversales en las tablas para asegurar el rendimiento y facilidad de uso:
* **Paginación Inteligente (Client-side):** Límite de 50 registros por hoja, optimizando la velocidad de carga de la información.
* **Encabezados Fijos (Sticky Headers):** Mantiene fijos los títulos de las columnas y totales al hacer scroll vertical en las tablas.
* **Totales a la Vista:** Todos los montos se suman dinámicamente y se muestran tanto al **pie de la tabla (TFOOT)** como en los **encabezados de las columnas (THEAD)**, agilizando el control del cuadre.
* **Ordenamiento Dinámico:** Todas las columnas son ordenables (ascendente/descendente) mediante flechas interactivas.
* **Filtros Personalizados:** Búsquedas por nombre de proveedor, fecha, referencia, tipo de moneda (Bs/USD) y tipo de documento (Factura/Nota).
* **Tooltips Visuales (Hover):** En celdas complejas (ej. Múltiples pagos), pasar el cursor despliega un menú flotante con el desglose exacto por método de pago.
* **Doble Visión Monetaria:** La aplicación siempre muestra la referencia dual. Los montos en Bolívares incluyen debajo su equivalente en USD para rápida verificación.

---

## Detalle por Módulos y Lógica de Negocio

### 1. Dashboard (Resumen General)
Es el centro de mando. Recolecta indicadores de salud de la empresa con los siguientes renglones específicos:
* **VENTAS:** Ingresos (Bs y $), CxC (método de pago "crédito"), e Impuestos.
* **COMPRAS:** Mercancías y 25% Pago de IVA.
* **GASTOS:** Nómina, Servicios y Gastos Operativos.
* **MOVIMIENTOS:** Bancos (Bs y $) y Cajas (Bs y $).

### 2. Ingresos (Ventas)
* **Origen:** 100% Odoo (vía XML-RPC, consultando `pos.order` y `pos.payment`).
* **Lógica de Desglose de Facturas:** Extrae de manera granular los pagos individuales asociados a una factura. Si una orden se paga con múltiples métodos, la tabla lo fragmenta de inmediato.
* **Detección Monetaria de Alta Precisión:**
  * **USD ($):** Detecta cadenas como "dolares", "dólar", "zelle", "binance", "saldo a favor", "panama", "verde".
  * **Bolívares (Bs):** Detecta "bs", "bolivar", "pago movil", "punto", "transferencia", "venezuela", "pdv", "ves", "bancamiga", "megasoft".
* **Extracción de Tasa Aplicada (Foreign Rate):** La aplicación no solo muestra dólares; busca dentro de Odoo los campos internos `foreign_rate` y `foreign_amount` para presentar la tasa de conversión **exacta** del día y el **monto real exacto en Bolívares** recibido en la tienda.
* **Reglas Especiales:** 
  * Los métodos como Cashea, CxC o "Crédito" se agrupan netamente en Dólares ($) bajo el renglón "Por Cobrar".
  * Retenciones se restan limpiamente del total recibido en caja para que no inflen los cuadres.
  * Separación de IVA vs. IGTF basándose en el tipo de operación.

### 3. Compras (Inventario)
* **Origen:** 100% Odoo (`account.move` para facturas y devoluciones de proveedores).
* **Lógica Estructural:** Aplica las mismas capacidades de navegación y UX del módulo de Ingresos (Paginación, Sticky Headers, Sumatorias en Títulos, Ordenamientos).
* **Separación Operativa:** Identifica automáticamente Documentos Fiscales (con Base Imponible e Impuestos desglosados) y Documentos No Fiscales (Notas de Entrega). Identifica el Estado de Pago (Pagado vs CxP).

### 4. Cuentas por Cobrar (CxC)
* **Lógica:** Se auditan las ventas de Odoo para identificar operaciones donde el cliente adeuda una porción (Cashea, créditos corporativos). Estos montos entran a un seguimiento de "Cuentas por Cobrar" directo del módulo de Ingresos/Dashboard.

### 5. Caja & Bancos
* **Origen:** PostgreSQL (Local).
* **Lógica:** Arranca con saldos iniciales (separados en **Bs y Dólares**) tanto para cajas físicas como para cuentas bancarias. Se alimenta de las operaciones diarias (ingresos/egresos) generando un saldo final de flujo de caja.

### 6. Gastos CXP
* **Origen:** Híbrido (Odoo / Local).
* **Lógica:** Esta sección unifica Gastos y Cuentas por Pagar. Su función es **crear en Odoo** los gastos según el tipo de documento: Factura (fiscal, con nro. de factura y control, BI, imp) o Nota (no fiscal, con o sin referencia). Utiliza un concepto/servicio configurado en Odoo para volcar los gastos directamente a contabilidad sin distorsionar inventarios.

### 7. Tesorería
* **Origen:** PostgreSQL (Local).
* **Lógica:** Toma todas las cuentas pendientes generadas en *Gastos CXP* y permite aprobar, agrupar, ordenar y emitir pagos formalizados (cheques, transferencias) descontándolo del módulo de *Caja & Bancos*.

### 8. Roles y Permisología
* **Origen:** PostgreSQL (Local).
* **Lógica:** Seguridad multi-nivel de acceso. Administración de usuarios, contraseñas, perfiles (Super Administrador, Cajero, Tesorero) limitando las rutas (`/ingresos`, `/compras`, etc) y las acciones (Crear, Editar, Eliminar) mediante tokens seguros de sesión.
