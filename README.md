# Gestión de Gimnasio

Aplicación en Node.js para que un entrenador o gimnasio administre clientes, planes de entrenamiento, contratos, seguimiento físico, nutrición y finanzas. Se puede usar desde la **consola** o desde el **navegador**: las dos versiones comparten los mismos servicios, modelos y base de datos.

## Tecnologías

- Node.js con módulos ES (`type: module`)
- MySQL (driver `mysql2`)
- `inquirer` para los menús interactivos
- `chalk` para colores en consola
- `dayjs` para manejo de fechas
- `dotenv` para variables de entorno
- Módulo `http` nativo de Node para la API y el servidor web (sin dependencias nuevas)
- HTML, CSS y JavaScript vanilla (módulos ES) para el front

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
  commands/            menus e interaccion con el usuario en consola
  web/                 version web: servidor http, enrutador y controladores de la API
  utils/               funciones compartidas (fechas y lectura de datos escritos por el usuario)
public/                front de la version web (HTML, CSS y JS)
  css/                 tokens de diseño, estructura, componentes y estilos de cada vista
  js/                  cliente de la api, ayudas de interfaz, enrutador y una vista por modulo
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

3. Copia `.env.example` como `.env` en la raíz y completa tus datos:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_NAME=gimnasio_db
   WEB_PORT=3000
   ```

4. Ejecuta la aplicación en la versión que prefieras:

   ```
   npm start        # consola
   npm run web      # navegador, en http://localhost:3000
   ```

## Funcionalidades

- **Clientes**: crear, listar, actualizar, eliminar.
- **Planes**: crear y listar planes de entrenamiento.
- **Contratos**: asignar plan a cliente (contrato automático), consultar por cliente, renovar, cancelar y finalizar.
- **Seguimiento físico**: registrar avances semanales, ver progreso cronológico, eliminar registros.
- **Nutrición**: planes de alimentación, alimentos por día, reporte semanal.
- **Finanzas**: registrar ingresos y egresos, pagar mensualidades, consultar balance por rango de fechas o por cliente.

## Versión web

La versión web agrega una capa nueva al lado de `commands/`, sin cambiar las reglas de negocio:

```
navegador (public/js/api.js)
   → /api/... (src/web/rutas.js)
   → controladores (src/web/controladores)   traducen HTTP ⇄ servicio, sin SQL ni reglas
   → servicios (container.js)                 los mismos que usa la consola
   → repositorios → MySQL
```

- Los controladores reciben sus servicios por parámetro, igual que el resto del proyecto (inyección de dependencias).
- Las validaciones siguen en los modelos y las transacciones en los servicios: si una regla no se cumple, la API responde `400` con la misma lista de errores que muestra la consola.
- El front no calcula nada importante: totales, balances, vigencias y variaciones de peso llegan calculados desde el servidor.

| Módulo | Rutas principales |
|--------|-------------------|
| Clientes | `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id` |
| Planes | `GET/POST /api/planes`, `GET /api/planes/:id` |
| Contratos | `GET /api/clientes/:id/contratos`, `POST /api/contratos`, `POST /api/contratos/:id/renovar`, `/cancelar`, `/finalizar` |
| Seguimiento | `GET /api/clientes/:id/progreso`, `POST /api/seguimientos`, `DELETE /api/seguimientos/:id` |
| Nutrición | `GET /api/clientes/:id/planes-alimentacion`, `GET /api/clientes/:id/reporte-nutricional?inicio=`, `POST /api/planes-alimentacion`, `POST /api/alimentos` |
| Finanzas | `GET/POST /api/movimientos`, `POST /api/contratos/:id/pagos`, `GET /api/balance`, `GET /api/clientes/:id/balance` |
| Otros | `GET /api/salud` (estado de la base de datos), `GET /api/catalogos` (niveles, comidas y categorías) |

## Patrones de diseño

Ver [`docs/patrones-diseno.md`](docs/patrones-diseno.md): Repository, Factory e inyección de dependencias, además de los principios SOLID aplicados.

## Transacciones

Las operaciones críticas (asignar/renovar/cancelar un plan, registrar el pago de una mensualidad) usan transacciones reales de MySQL (`BEGIN`, `COMMIT`, `ROLLBACK`), para que no queden datos a medias si algo falla. Todas pasan por un solo helper, `src/infraestructura/transaccion.js`, que hace el `COMMIT` o el `ROLLBACK` y libera la conexión.

## Flujo de trabajo

El proyecto se desarrolló con un backlog en GitHub Projects, ramas `feature/`, `fix/` y `docs/` desde `develop`, y Pull Requests hacia `develop`. Cada sprint se integró a `main` al completarse.

## Video de presentación

[link a video explicativo de la app en uso <--](https://drive.google.com/drive/folders/1okg0p2OLBYAmBquQIgQGc3C-1WH2Z2JX?usp=drive_link)