import dayjs from "dayjs";
import { Contrato } from "../models/contrato.js";

export class ContratoFactory {
  static crearDesdePlan(clienteId, plan, opciones = {}) {
    const inicio = opciones.fecha_inicio ? dayjs(opciones.fecha_inicio) : dayjs();
    const fin = inicio.add(plan.duracion_semanas, "week");

    return new Contrato({
      cliente_id: clienteId,
      plan_id: plan.id,
      condiciones:
        opciones.condiciones ??
        `Plan "${plan.nombre}" de ${plan.duracion_semanas} semanas.`,
      precio: Number(plan.precio),
      fecha_inicio: inicio.format("YYYY-MM-DD"),
      fecha_fin: fin.format("YYYY-MM-DD"),
      estado: "activo",
    });
  }
}