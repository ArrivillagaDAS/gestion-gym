import { ContratoFactory } from "../factories/contrato-factory.js";

export class ContratoService {
  constructor({ contratos, planes, seguimientos, ejecutarTransaccion }) {
    this.contratos = contratos;
    this.planes = planes;
    this.seguimientos = seguimientos;
    this.ejecutarTransaccion = ejecutarTransaccion;
  }

  async asignarPlan(clienteId, planId, opciones = {}) {
    const plan = await this.planes.buscarPorId(planId);
    if (!plan) {
      return { exito: false, errores: ["El plan no existe."] };
    }

    // el contrato se genera automaticamente con la factory
    const contrato = ContratoFactory.crearDesdePlan(clienteId, plan, opciones);
    if (!contrato.esValido()) {
      return { exito: false, errores: contrato.errores };
    }

    // accion critica: verificar y crear el contrato ocurren juntos o no ocurren
    return this.ejecutarTransaccion(async (conexion) => {
      // el bloqueo evita que dos asignaciones del mismo cliente se crucen
      const existe = await this.contratos.bloquearCliente(clienteId, conexion);
      if (!existe) {
        return { exito: false, errores: ["El cliente no existe."] };
      }

      const activo = await this.contratos.buscarActivo(clienteId, planId, conexion);
      if (activo) {
        return {
          exito: false,
          errores: ["El cliente ya tiene un contrato activo con este plan."],
        };
      }

      const id = await this.contratos.crear(contrato, conexion);
      return { exito: true, id, contrato };
    });
  }

  async listarPorCliente(clienteId) {
    return this.contratos.listarPorCliente(clienteId);
  }

  async contarSeguimientos(contratoId) {
    return this.seguimientos.contarPorContrato(contratoId);
  }

  async renovar(contratoId) {
    // accion critica: cerrar el contrato viejo y crear el nuevo ocurren juntos o no ocurren
    return this.ejecutarTransaccion(async (conexion) => {
      // el bloqueo evita que dos renovaciones del mismo contrato se crucen
      const actual = await this.contratos.bloquearPorId(contratoId, conexion);
      if (!actual) {
        return { exito: false, errores: ["El contrato no existe."] };
      }

      // regla de negocio: solo se renueva un contrato activo
      if (actual.estado !== "activo") {
        return { exito: false, errores: [`El contrato está ${actual.estado}, no se puede renovar.`] };
      }

      const plan = await this.planes.buscarPorId(actual.plan_id);
      if (!plan) {
        return { exito: false, errores: ["El plan del contrato ya no existe."] };
      }

      // el contrato nuevo empieza donde termina el anterior
      const nuevo = ContratoFactory.crearDesdePlan(actual.cliente_id, plan, {
        fecha_inicio: actual.fecha_fin,
        condiciones: `Renovación del contrato #${actual.id} (plan "${plan.nombre}", ${plan.duracion_semanas} semanas).`,
      });
      if (!nuevo.esValido()) {
        return { exito: false, errores: nuevo.errores };
      }

      // primero se cierra el viejo, para que no choque con la regla de contrato activo repetido
      const cerrado = await this.contratos.cambiarEstado(actual.id, "finalizado", "activo", conexion);
      if (!cerrado) {
        return { exito: false, errores: ["El contrato cambió de estado, intenta de nuevo."] };
      }

      const id = await this.contratos.crear(nuevo, conexion);
      return { exito: true, id, contrato: nuevo };
    });
  }

  async cancelar(contratoId) {
    // accion critica: borrar el seguimiento y cancelar el contrato ocurren juntos o no ocurren
    return this.ejecutarTransaccion(async (conexion) => {
      // el bloqueo evita que el contrato cambie de estado mientras se cancela
      const actual = await this.contratos.bloquearPorId(contratoId, conexion);
      if (!actual) {
        return { exito: false, errores: ["El contrato no existe."] };
      }

      // regla de negocio: solo se cancela un contrato activo
      if (actual.estado !== "activo") {
        return { exito: false, errores: [`El contrato está ${actual.estado}, no se puede cancelar.`] };
      }

      const eliminados = await this.seguimientos.eliminarPorContrato(actual.id, conexion);

      const cancelado = await this.contratos.cambiarEstado(actual.id, "cancelado", "activo", conexion);
      if (!cancelado) {
        return { exito: false, errores: ["El contrato cambió de estado, intenta de nuevo."] };
      }

      return { exito: true, seguimientosEliminados: eliminados };
    });
  }

  async finalizar(contratoId) {
    // un solo UPDATE condicionado al estado activo: es atomico, no necesita transaccion
    // el seguimiento no se toca, porque el plan termino normalmente
    const cambio = await this.contratos.cambiarEstado(contratoId, "finalizado", "activo");
    if (!cambio) {
      return { exito: false, errores: ["El contrato no existe o ya no está activo."] };
    }

    return { exito: true };
  }
}