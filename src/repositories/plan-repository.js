export class PlanRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async crear(plan) {
    const [resultado] = await this.pool.query(
      `INSERT INTO planes (nombre, duracion_semanas, metas_fisicas, nivel, precio)
       VALUES (?, ?, ?, ?, ?)`,
      [plan.nombre, plan.duracion_semanas, plan.metas_fisicas ?? null, plan.nivel, plan.precio]
    );
    return resultado.insertId;
  }

  async listarTodos() {
    const [filas] = await this.pool.query("SELECT * FROM planes ORDER BY id");
    return filas;
  }

  async buscarPorId(id) {
    const [filas] = await this.pool.query("SELECT * FROM planes WHERE id = ?", [id]);
    return filas[0] || null;
  }
}