# Patrones de diseño

## 1. Repository

Encapsula el acceso a MySQL. Cada entidad tiene su repositorio, que es el único lugar del proyecto que escribe SQL. El resto del código nunca toca la base de datos directamente.

Archivos:
- `services/cliente-repository.js`
- `services/plan-repository.js`
- `services/contrato-repository.js`
- `services/seguimiento-repository.js`
- `services/nutricion-repository.js`
- `services/movimiento-repository.js`

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

Archivo: `services/contrato-factory.js`

```javascript
static crearDesdePlan(clienteId, plan, opciones = {}) {
  const inicio = opciones.fecha_inicio ? dayjs(opciones.fecha_inicio) : dayjs();
  const fin = inicio.add(plan.duracion_semanas, "week");
  return new Contrato({ ... });
}
```

Se usa en `contrato-service.js`, en `asignarPlan()` y en `renovar()`.

## Principios SOLID aplicados

- **Responsabilidad única**: `Modelo` solo valida, `Repository` solo consulta la base de datos, `Service` solo controla reglas de negocio y transacciones, `Commands` solo habla con el usuario.
- **Abierto/cerrado**: agregar un modelo nuevo (ej. `Movimiento`) no obligó a modificar `Modelo`, solo a declarar su propio esquema.