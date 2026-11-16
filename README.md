# Gestión de Gimnasio

Aplicación de línea de comandos en Node.js para que un entrenador o gimnasio administre clientes, planes de entrenamiento, contratos, seguimiento físico, nutrición y finanzas.

## Tecnologías

- Node.js con módulos ES (`type: module`)
- MySQL (driver `mysql2`)
- `inquirer` para los menús interactivos
- `chalk` para colores en consola
- `dayjs` para manejo de fechas
- `dotenv` para variables de entorno

## Estructura del proyecto

```
src/
  index.js             punto de entrada de la aplicacion
  container.js         arma repositorios y servicios (inyeccion de dependencias)
  config/              conexion a la base de datos (pool)
  models/              clases con validaciones por campo
  repositories/        acceso a MySQL, el unico lugar donde se escribe SQL
  factories/           creacion de objetos (ContratoFactory)
  services/            reglas de negocio; reciben sus dependencias por constructor
  infraestructura/     ayudas tecnicas (manejo de transacciones)
  commands/            menus e interaccion con el usuario
  utils/               funciones compartidas (fechas y lectura de datos escritos por el usuario)
scripts/               utilidades, como la generacion del PDF de planeacion
sql/                   script de creacion de tablas
docs/                  documentacion adicional
```

## Instalación

1. Clona el repositorio e instala las dependencias:

   ```
   npm install
   ```

2. Ejecuta el script (crea la base de datos `gimnasio_db` y las tablas; requiere MySQL 8.0.13 o superior):

   ```
   mysql -u root -p < sql/schema.sql
   ```

   (o pégalo en MySQL Workbench)

3. Crea un archivo `.env` en la raíz con:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_NAME=gimnasio_db
   ```

4. Ejecuta la aplicación:

   ```
   node src/index.js
   ```

## Funcionalidades

- **Clientes**: crear, listar, actualizar, eliminar.
- **Planes**: crear y listar planes de entrenamiento.
- **Contratos**: asignar plan a cliente (contrato automático), consultar por cliente, renovar, cancelar y finalizar.
- **Seguimiento físico**: registrar avances semanales, ver progreso cronológico, eliminar registros.
- **Nutrición**: planes de alimentación, alimentos por día, reporte semanal.
- **Finanzas**: registrar ingresos y egresos, pagar mensualidades, consultar balance por rango de fechas o por cliente.

## Patrones de diseño

Ver [`docs/patrones-diseno.md`](docs/patrones-diseno.md): Repository, Factory e inyección de dependencias, además de los principios SOLID aplicados.

## Transacciones

Las operaciones críticas (asignar/renovar/cancelar un plan, registrar el pago de una mensualidad) usan transacciones reales de MySQL (`BEGIN`, `COMMIT`, `ROLLBACK`), para que no queden datos a medias si algo falla. Todas pasan por un solo helper, `src/infraestructura/transaccion.js`, que hace el `COMMIT` o el `ROLLBACK` y libera la conexión.

## Flujo de trabajo

El proyecto se desarrolló con un backlog en GitHub Projects, ramas `feature/`, `fix/` y `docs/` desde `develop`, y Pull Requests hacia `develop`. Cada sprint se integró a `main` al completarse.

## Video de presentación

[link a video explicativo de la app en uso <--](https://drive.google.com/drive/folders/1okg0p2OLBYAmBquQIgQGc3C-1WH2Z2JX?usp=drive_link)