export class ClienteRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async crear(cliente) {
    const [resultado] = await this.pool.query(
      `INSERT INTO clientes (nombre, apellido, email, telefono, fecha_nacimiento)
       VALUES (?, ?, ?, ?, ?)`,
      [
        cliente.nombre,
        cliente.apellido,
        cliente.email ?? null,
        cliente.telefono ?? null,
        cliente.fecha_nacimiento ?? null,
      ]
    );
    return resultado.insertId;
  }

  async listarTodos() {
    const [filas] = await this.pool.query("SELECT * FROM clientes ORDER BY id");
    return filas;
  }

  async buscarPorId(id) {
    const [filas] = await this.pool.query("SELECT * FROM clientes WHERE id = ?", [id]);
    return filas[0] || null;
  }

  async actualizar(id, cliente) {
    await this.pool.query(
      `UPDATE clientes SET nombre = ?, apellido = ?, email = ?, telefono = ?, fecha_nacimiento = ?
       WHERE id = ?`,
      [
        cliente.nombre,
        cliente.apellido,
        cliente.email ?? null,
        cliente.telefono ?? null,
        cliente.fecha_nacimiento ?? null,
        id,
      ]
    );
  }

  async eliminar(id) {
    await this.pool.query("DELETE FROM clientes WHERE id = ?", [id]);
  }
}