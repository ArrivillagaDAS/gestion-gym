import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// la carpeta public esta en la raiz del proyecto, sin importar desde donde se ejecute el servidor
const CARPETA_PUBLICA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function noEncontrado(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("No encontrado");
}

export async function servirEstatico(req, res, rutaUrl) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end();
  }

  let relativa;
  try {
    relativa = decodeURIComponent(rutaUrl);
  } catch {
    return noEncontrado(res);
  }
  if (relativa.endsWith("/")) relativa += "index.html";

  // evita que una ruta con ../ lea archivos fuera de public
  const archivo = path.resolve(CARPETA_PUBLICA, "." + relativa);
  if (archivo !== CARPETA_PUBLICA && !archivo.startsWith(CARPETA_PUBLICA + path.sep)) {
    return noEncontrado(res);
  }

  try {
    const contenido = await fs.readFile(archivo);
    res.writeHead(200, {
      "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream",
      "Content-Length": contenido.length,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : contenido);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") return noEncontrado(res);
    throw error;
  }
}
