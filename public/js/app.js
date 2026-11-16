// arranque del front: enrutador por #/seccion, menu movil y estado del servidor
import * as api from "./api.js";
import { h, cargando, vacio, avisarError } from "./ui.js";

const SECCIONES = {
  inicio: "Inicio",
  clientes: "Clientes",
  planes: "Planes de entrenamiento",
  contratos: "Contratos",
  seguimiento: "Seguimiento físico",
  nutricion: "Nutrición",
  finanzas: "Finanzas",
};

const contenido = document.getElementById("contenido");
const titulo = document.getElementById("titulo-seccion");
const barra = document.getElementById("barra");
const botonMenu = document.getElementById("boton-menu");

function seccionActual() {
  const nombre = location.hash.replace(/^#\/?/, "").split("/")[0];
  return SECCIONES[nombre] ? nombre : "inicio";
}

// cada vista vive en js/vistas/<seccion>.js y exporta render(contenedor)
async function mostrar() {
  const seccion = seccionActual();
  titulo.textContent = SECCIONES[seccion];
  document.title = `${SECCIONES[seccion]} · Gestión de Gimnasio`;
  document.querySelectorAll(".menu a").forEach((a) => {
    if (a.dataset.seccion === seccion) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  abrirMenu(false);

  contenido.replaceChildren(cargando());

  let vista;
  try {
    vista = await import(`./vistas/${seccion}.js`);
  } catch {
    contenido.replaceChildren(vacio("Sección en construcción", "Esta parte del sistema todavía no está disponible."));
    return;
  }

  // si el usuario cambio de seccion mientras cargaba, no se pinta la vista vieja
  if (seccion !== seccionActual()) return;

  const lienzo = h("div", { class: "pila" });
  contenido.replaceChildren(lienzo);
  try {
    await vista.render(lienzo);
  } catch (error) {
    lienzo.replaceChildren(vacio("No se pudo cargar la sección", error.errores ? error.errores.join(" ") : error.message));
    avisarError(error);
  }
}

function abrirMenu(abrir) {
  barra.classList.toggle("abierta", abrir);
  botonMenu.setAttribute("aria-expanded", String(abrir));
  botonMenu.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
}

botonMenu.addEventListener("click", () => abrirMenu(!barra.classList.contains("abierta")));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") abrirMenu(false);
});

// indicador del pie de la barra: avisa si el servidor o MySQL dejan de responder
async function revisarServidor() {
  const estado = document.getElementById("estado-servidor");
  const texto = estado.querySelector(".texto");
  try {
    await api.salud();
    estado.className = "estado-servidor ok";
    texto.textContent = "Base de datos conectada";
  } catch (error) {
    estado.className = "estado-servidor error";
    texto.textContent = error.estado === 503 ? "Sin conexión con MySQL" : "Servidor sin respuesta";
  }
}

window.addEventListener("hashchange", mostrar);
// otras vistas pueden pedir que se vuelva a pintar la seccion actual
window.addEventListener("gimnasio:actualizar", mostrar);

if (!location.hash) history.replaceState(null, "", "#/inicio");
mostrar();
revisarServidor();
setInterval(revisarServidor, 30000);
