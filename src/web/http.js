// utilidades para traducir entre HTTP y los servicios
// los servicios no saben nada de HTTP: devuelven { exito, errores } o datos,
// y aqui se convierten en respuestas JSON con su codigo de estado

const LIMITE_CUERPO = 1024 * 1024; // 1 MB es de sobra para los formularios del sistema

// error con codigo de estado, para cortar una peticion desde cualquier controlador
export class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

export function enviarJson(res, estado, datos) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(estado, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(cuerpo),
    "Cache-Control": "no-store",
  });
  res.end(cuerpo);
}

// un resultado { exito: false, errores } es una regla de negocio que no se cumplio
export function enviarResultado(res, resultado, estadoExito = 200) {
  if (resultado && resultado.exito === false) {
    return enviarJson(res, 400, { exito: false, errores: resultado.errores });
  }
  return enviarJson(res, estadoExito, resultado);
}

export function leerJson(req) {
  return new Promise((resolver, rechazar) => {
    let tamano = 0;
    const partes = [];

    req.on("data", (parte) => {
      tamano += parte.length;
      if (tamano > LIMITE_CUERPO) {
        rechazar(new ErrorHttp(413, "Los datos enviados son demasiado grandes."));
        req.destroy();
        return;
      }
      partes.push(parte);
    });

    req.on("end", () => {
      const texto = Buffer.concat(partes).toString("utf8").trim();
      if (texto === "") return resolver({});

      try {
        const datos = JSON.parse(texto);
        if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
          return rechazar(new ErrorHttp(400, "Los datos enviados deben ser un objeto JSON."));
        }
        resolver(datos);
      } catch {
        rechazar(new ErrorHttp(400, "Los datos enviados no son un JSON válido."));
      }
    });

    req.on("error", rechazar);
  });
}

// id que viene en la ruta (/api/clientes/7): debe ser un entero positivo
export function idDeRuta(valor, nombre = "id") {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorHttp(400, `El ${nombre} debe ser un número entero positivo.`);
  }
  return id;
}

// convierte cualquier error en una respuesta, sin mostrar detalles internos al navegador
export function responderError(res, error) {
  if (error instanceof ErrorHttp) {
    return enviarJson(res, error.estado, { exito: false, errores: [error.message] });
  }

  // mismo mensaje que muestra la consola cuando se repite un valor unico (por ejemplo el email)
  if (error.code === "ER_DUP_ENTRY") {
    const coincidencia = String(error.sqlMessage).match(/key '.*\.(\w+)'/);
    const campo = coincidencia ? coincidencia[1] : "un campo";
    return enviarJson(res, 409, {
      exito: false,
      errores: [`Ya existe un registro con ese valor en "${campo}". Debe ser único.`],
    });
  }

  if (["ECONNREFUSED", "ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "PROTOCOL_CONNECTION_LOST"].includes(error.code)) {
    console.error("Base de datos no disponible:", error.message);
    return enviarJson(res, 503, { exito: false, errores: ["No se pudo conectar con la base de datos."] });
  }

  console.error("Error inesperado:", error);
  return enviarJson(res, 500, { exito: false, errores: ["Ocurrió un error inesperado en el servidor."] });
}
