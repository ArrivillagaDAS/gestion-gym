// ejecuta "trabajo" dentro de una transaccion real de MySQL
// - si el trabajo termina bien, hace commit
// - si el trabajo devuelve { exito: false } (una regla de negocio no se cumplio), hace rollback
// - si el trabajo lanza un error, hace rollback y lo vuelve a lanzar
// la conexion siempre se devuelve al pool
export async function enTransaccion(pool, trabajo) {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const resultado = await trabajo(conexion);

    if (resultado && resultado.exito === false) {
      await conexion.rollback();
    } else {
      await conexion.commit();
    }

    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}