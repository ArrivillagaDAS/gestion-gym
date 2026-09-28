export class ContratoRepository {
  async bloquearCliente(clienteId, conexion) {
    const [filas] = await conexion.query(
      "SELECT id FROM clientes WHERE id = ? FOR UPDATE",
      [clienteId]
    );
    return filas.length > 0;
  }

  async buscarActivo(clienteId, planId, conexion) {
    const [filas] = await conexion.query(
      "SELECT id FROM contratos WHERE cliente_id = ? AND plan_id = ? AND estado = 'activo'",
      [clienteId, planId]
    );
    return filas[0] || null;
  }

  async crear(contrato, conexion) {
    const [resultado] = await conexion.query(
      `INSERT INTO contratos (cliente_id, plan_id, condiciones, precio, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        contrato.cliente_id,
        contrato.plan_id,
        contrato.condiciones,
        contrato.precio,
        contrato.fecha_inicio,
        contrato.fecha_fin,
        contrato.estado,
      ]
    );
    return resultado.insertId;
  }
}