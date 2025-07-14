**Nuevo Prompt: Desarrollo de Aplicación Asistente de RR.HH. para Gestión de Personal en Fincas**

Desarrollar una aplicación web robusta, segura, modular y funcional para la gestión de personal en el sector agrícola (fincas), con un fuerte enfoque en la gestión de horas, ausencias, control de medicina, registro/cálculo de movilización, pago inicial para personal reciente y comparación de datos vía Excel.

**Alcance y Funcionalidades Principales:**

1.  **Gestión de Usuarios:** Sistema de autenticación y autorización con roles (Admin, Manager, Medical).
2.  **Gestión de Empresas:** Permitir la administración de múltiples empresas, actuando como contenedor principal para todos los demás datos.
3.  **Gestión de Proyectos (Fincas):** Administración de proyectos o fincas bajo cada empresa. Validar que no existan nombres de proyecto duplicados dentro de la misma empresa.
4.  **Centro de Datos de Personal (Trabajadores):**
    *   Colección centralizada de trabajadores bajo cada empresa (`/companies/{companyId}/workers`).
    *   Datos básicos del trabajador (Nombre Completo, Cédula - validar formato y unicidad dentro de la empresa -, datos de contacto, cargo, fecha de ingreso, salario base mensual, etc.).
    *   Esta colección será la fuente única de verdad referenciada por otros módulos.
5.  **Gestión de Horas y Ausencias:**
    *   Registro de entradas de horas trabajadas y ausencias por trabajador, asociadas a una fecha y al Proyecto/Finca donde se realizó el trabajo.
    *   Capacidad de distinguir entre horas diurnas, horas extras diurnas, y opcionalmente identificar horas nocturnas/extras nocturnas (con un flag `isNightShift`).
    *   Gestión de diferentes tipos de ausencias (Vacaciones, Maternidad, Paternidad, Enfermedad, Justificada, Injustificada, Otros).
    *   Cálculo de horas extras según políticas configurables.
6.  **Módulo de Vacaciones:**
    *   Seguimiento de días de vacaciones disponibles y consumidos por cada trabajador.
    *   Registro de períodos de vacaciones tomados.
    *   Considerar la política configurable de días de vacaciones obligatorios al año.
7.  **Módulo de Control de Medicina:**
    *   **Inventario de Medicina:** Gestión de un catálogo de medicinas por empresa (`/companies/{companyId}/medicines`) con campos: Nombre, Presentación, Costo Unitario, Fecha de Vencimiento, Stock (opcional para control básico de inventario).
    *   **Registro de Entregas:** Registrar la entrega de medicina a un trabajador específico, asociando la medicina del inventario, cantidad, fecha de entrega, costo total de la entrega, y el usuario médico que realizó la entrega. Al registrar una entrega, si se gestiona inventario, se debería descontar del stock.
    *   **Gestión de Descuentos:** Asociar a cada entrega el valor a descontar mensualmente al trabajador y controlar el saldo pendiente si el pago es en parcialidades. La aplicación debe llevar el control total de los valores a pagar/descontar por trabajador.
8.  **Gestión de Movilización:**
    *   **Registro de Movilización:** Permitir registrar eventos de movilización para trabajadores, asociados a una fecha y potencialmente a un proyecto. Se necesita definir la información a registrar (ej: fecha, trabajador, monto/valor de movilización, motivo).
    *   **Cálculo de Movilización Anual:** Generar la sumatoria total del valor percibido por movilización para cada trabajador en un período fiscal específico: **del 01 de diciembre del año inicial al 30 de noviembre del año siguiente.**
9.  **Gestión de Pago Inicial para Personal de Ingreso Reciente:**
    *   Módulo específico para calcular la liquidación de trabajadores que ingresan en el mes actual y pasan a nómina regular al mes siguiente.
    *   Calcular días trabajados en el mes de ingreso: `30 - Día de Ingreso + 1` (mes con 30 días para cálculo proporcional).
    *   Calcular Ingresos: Pago proporcional de salario base según días trabajados + 100% del valor total de horas extras ganadas en el período de ingreso + Otros ingresos aplicables.
    *   Calcular Descuentos: Total de almuerzos (si se gestiona) + Total de descuentos de medicina aplicables en el mes de ingreso + Otros descuentos aplicables.
    *   Calcular valor total a pagar: Total Ingresos - Total Descuentos.
    *   Generar reporte detallado de esta liquidación inicial.
10. **Módulo de Comparación de Archivos Excel:**
    *   Permitir al usuario cargar dos archivos Excel para compararlos y encontrar diferencias.
    *   Funcionalidad de comparación basada en plantillas predefinidas para diferentes tipos de datos (ej: horas, personal, descuentos de medicina).
    *   El usuario especifica la clave de comparación (columna identificadora, ej: Cédula).
    *   Identificar y reportar: Filas que solo existen en un archivo, y diferencias en valores de columnas específicas para filas que existen en ambos.
    *   Generar un reporte detallado de diferencias (por pantalla y exportable a Excel/CSV).
    *   Proporcionar plantillas descargables para los archivos a comparar.
11. **Dashboard/Configuración de Políticas:**
    *   Interfaz de administración (para Admin/Manager) para configurar parámetros globales por empresa (`/companies/{companyId}/settings`):
        *   Número máximo de horas extras permitidas (diarias y semanales).
        *   Número de días obligatorios por vacaciones, maternidad, paternidad, etc.
        *   Posiblemente tarifas de recargo (nocturno, feriados) si se implementa el cálculo en la app.
12. **Carga Masiva de Datos vía Excel:**
    *   Implementar funcionalidades de importación para: Personal (Creación y/o Actualización), Inventario de Medicina, Entregas de Medicina, Ausencias/Vacaciones, Eventos de Movilización.
    *   Para cada tipo de importación, proporcionar una **plantilla de Excel descargable** con el formato esperado.
    *   Implementar **validaciones robustas** de cada fila durante la importación (campos requeridos, formato de datos, existencia de referencias, unicidad, fechas válidas).
    *   Generar un **reporte de errores detallado** (descargable en Excel/CSV) indicando las filas con problemas y el motivo específico.
13. **Reportes Exportables a Excel:**
    *   Generar reportes personalizados por rango de fechas y/o filtros (trabajador, proyecto).
    *   Reportes esenciales:
        *   **Informe General de Horas.**
        *   **Informe de Horas Extras.**
        *   Resumen de Ausencias.
        *   Reporte de Medicina Entregada/Descuentos Pendientes.
        *   **Reporte Anual de Movilización (Período 01 Dic - 30 Nov).**
        *   Reporte de Pago Inicial para Personal de Ingreso Reciente.
        *   Reporte de Diferencias de Archivos Excel.
    *   Mostrar resúmenes/detalles de estos reportes por pantalla.
    *   Definir y utilizar un **formato de archivo Excel específico** para cada reporte.
14. **Arquitectura y Tecnología:**
    *   Diseñar y construir la aplicación con **modularidad** como principio clave (estructura de carpetas por módulos, Service Layer, TypeScript).
    *   Utilizar **Firebase** (Authentication, Firestore, Cloud Functions, Hosting) como backend.
    *   Implementar **Firebase Security Rules** robustas para controlar el acceso a los datos basado en roles y pertenencia a la empresa.
    *   Desarrollar una capa de **API** (utilizando **Firebase Cloud Functions HTTPs**) para manejar la lógica de negocio compleja, validaciones críticas, operaciones de carga masiva, generación de reportes complejos y aplicación de políticas.
    *   La aplicación frontend será una **aplicación web** (utilizando React/Next.js).

**Objetivo:** Crear una herramienta eficiente, simple de usar, segura y adaptable que centralice la gestión de personal clave para las fincas, incluyendo horas, ausencias, medicina, movilización, gestión de pagos iniciales y comparación de datos, reduciendo la carga administrativa y proporcionando datos precisos, cálculos específicos y reportes detallados para la toma de decisiones y procesos como la nómina.