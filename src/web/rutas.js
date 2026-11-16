// une las rutas de la API con sus controladores
// los servicios salen de container.js, igual que en los comandos de consola
import { pool } from "../config/database.js";
import { Enrutador } from "./enrutador.js";
import { enviarJson } from "./http.js";

export function crearRutas() {
  const rutas = new Enrutador();

  // permite saber desde el navegador si el servidor y la base de datos responden
  rutas.get("/api/salud", async ({ res }) => {
    await pool.query("SELECT 1");
    enviarJson(res, 200, { exito: true, baseDeDatos: "conectada" });
  });

  return rutas;
}
