// punto de entrada de la version web: npm run web
// sirve el front de public/ y una API JSON en /api que usa los mismos servicios que la consola
import http from "node:http";
import { pool } from "../config/database.js";
import { crearRutas } from "./rutas.js";
import { servirEstatico } from "./estaticos.js";
import { enviarJson, responderError } from "./http.js";

const PUERTO = Number(process.env.WEB_PORT) || 3000;
const rutas = crearRutas();

async function atender(req, res) {
  const url = new URL(req.url, "http://localhost");

  try {
    if (!url.pathname.startsWith("/api/")) {
      return await servirEstatico(req, res, url.pathname);
    }

    const ruta = rutas.buscar(req.method, url.pathname);
    if (!ruta) {
      return enviarJson(res, 404, { exito: false, errores: ["Ruta no encontrada."] });
    }
    if (ruta.metodoNoPermitido) {
      return enviarJson(res, 405, { exito: false, errores: ["Método no permitido en esta ruta."] });
    }

    await ruta.manejador({ req, res, params: ruta.params, query: url.searchParams });
  } catch (error) {
    if (!res.headersSent) responderError(res, error);
    else res.end();
  }
}

const servidor = http.createServer(atender);

servidor.listen(PUERTO, () => {
  console.log(`Gestión de Gimnasio web en http://localhost:${PUERTO}`);
});

// igual que en index.js: sin cerrar el pool el proceso queda abierto
async function cerrar() {
  servidor.close();
  await pool.end();
  process.exit(0);
}

process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
