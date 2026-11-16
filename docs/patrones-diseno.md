# Patrones de diseño

## 1. Repository

Encapsula el acceso a MySQL. Cada entidad tiene su repositorio, que es el único lugar del proyecto que escribe SQL. El resto del código nunca toca la base de datos directamente.

Archivos:
- `repositories/cliente-repository.js`
- `repositories/plan-repository.js`
- `repositories/contrato-repository.js`
- `repositories/seguimiento-repository.js`
- `repositories/nutricion-repository.js`
- `repositories/finanzas-repository.js`

Cada repositorio recibe el `pool` por constructor (no lo importa), y las consultas de una tabla viven en el repositorio de esa tabla.

Ejemplo, en `contrato-repository.js`:

```javascript
async crear(contrato, conexion) {
  const [resultado] = await conexion.query(
    `INSERT INTO contratos (...) VALUES (...)`,
    [...]
  );
  return resultado.insertId;
}
```

## 2. Factory

`ContratoFactory` centraliza cómo se arma un contrato a partir de un plan: calcula fechas, precio y condiciones. Así, tanto "asignar plan" como "renovar" generan el contrato de la misma forma, sin repetir esa lógica.

Archivo: `factories/contrato-factory.js`

```javascript
static crearDesdePlan(clienteId, plan, opciones = {}) {
  const inicio = opciones.fecha_inicio ? dayjs(opciones.fecha_inicio) : dayjs();
  const fin = inicio.add(plan.duracion_semanas, "week");
  return new Contrato({ ... });
}
```

Se usa en `contrato-service.js`, en `asignarPlan()` y en `renovar()`.

## 3. Inyección de dependencias

Ninguna clase crea sus dependencias con `new` por dentro: las recibe por el constructor. Los únicos `new` de repositorios y servicios están en `src/container.js`.

```javascript
export class ContratoService {
  constructor({ contratos, planes, seguimientos, ejecutarTransaccion }) {
    this.contratos = contratos;
    this.planes = planes;
    this.seguimientos = seguimientos;
    this.ejecutarTransaccion = ejecutarTransaccion;
  }
}
```

Las transacciones también se inyectan: los servicios llaman a `ejecutarTransaccion`, que viene de `src/infraestructura/transaccion.js`, y no tocan el `pool` directamente.

## Principios SOLID aplicados

- **Responsabilidad única**: `Modelo` solo valida, `Repository` solo consulta la base de datos, `Service` solo controla reglas de negocio y transacciones, `Commands` solo habla con el usuario.
- **Abierto/cerrado**: agregar un modelo nuevo (ej. `Movimiento`) no obligó a modificar `Modelo`, solo a declarar su propio esquema.
- **Inversión de dependencias**: los servicios no dependen de clases concretas creadas por ellos mismos, sino de lo que reciben por constructor. Para probar un servicio basta pasarle un repositorio falso.