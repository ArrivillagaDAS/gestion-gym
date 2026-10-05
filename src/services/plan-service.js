import { Plan } from "../models/plan.js";

export class PlanService {
  constructor({ planes }) {
    this.repositorio = planes;
  }

  async crear(datos) {
    const plan = new Plan(datos);

    if (!plan.esValido()) {
      return { exito: false, errores: plan.errores };
    }

    const id = await this.repositorio.crear(plan);
    return { exito: true, id };
  }

  async listarTodos() {
    return this.repositorio.listarTodos();
  }

  async buscarPorId(id) {
    return this.repositorio.buscarPorId(id);
  }
}