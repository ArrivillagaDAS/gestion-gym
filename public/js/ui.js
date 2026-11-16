// ayudas de interfaz compartidas por todas las vistas
// los textos siempre entran con textContent, nunca como HTML, para no ejecutar datos del usuario

// crea un elemento: h("button", { class: "boton", onclick }, "Guardar")
export function h(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);

  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave.startsWith("on") && typeof valor === "function") {
      nodo.addEventListener(clave.slice(2), valor);
    } else if (clave === "dataset") {
      Object.assign(nodo.dataset, valor);
    } else if (valor === true) {
      nodo.setAttribute(clave, "");
    } else {
      nodo.setAttribute(clave, valor);
    }
  }

  agregar(nodo, hijos);
  return nodo;
}

function agregar(nodo, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === undefined || hijo === null || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

// iconos de trazo; se arman con el DOM para no usar innerHTML
const TRAZOS = {
  mas: ["M12 5v14M5 12h14"],
  editar: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  borrar: ["M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"],
  renovar: ["M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"],
  pago: ["M3 7h18v11H3zM3 11h18M7 15h3"],
  cerrar: ["M6 6l12 12M18 6L6 18"],
};

export function icono(nombre) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of TRAZOS[nombre] || []) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

export function boton(texto, { clase = "", iconoNombre, ...atributos } = {}) {
  return h("button", { type: "button", class: `boton ${clase}`.trim(), ...atributos }, iconoNombre && icono(iconoNombre), texto);
}

// ---------- formatos ----------
const moneda = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" });
const fechaLarga = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const formatoMoneda = (valor) => moneda.format(Number(valor) || 0);

export function formatoFecha(texto) {
  if (!texto) return "—";
  const fecha = new Date(`${texto}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? texto : fechaLarga.format(fecha);
}

// fechas locales en AAAA-MM-DD, el formato que esperan los modelos
export function aTextoFecha(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export const hoy = () => aTextoFecha(new Date());

export function rangoDelMes(base = new Date()) {
  return {
    desde: aTextoFecha(new Date(base.getFullYear(), base.getMonth(), 1)),
    hasta: aTextoFecha(new Date(base.getFullYear(), base.getMonth() + 1, 0)),
  };
}

// lunes de la semana de una fecha
export function lunesDe(base = new Date()) {
  const fecha = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const dia = (fecha.getDay() + 6) % 7;
  fecha.setDate(fecha.getDate() - dia);
  return aTextoFecha(fecha);
}

export const nombreCompleto = (cliente) => `${cliente.nombre} ${cliente.apellido}`;

export const capitalizar = (texto) => {
  const limpio = String(texto ?? "").replaceAll("_", " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

// ---------- piezas de interfaz ----------
export function etiquetaEstado(valor) {
  return h("span", { class: `etiqueta-estado ${valor}` }, capitalizar(valor));
}

export function cabecera(descripcion, ...acciones) {
  return h("div", { class: "cabecera" }, h("p", {}, descripcion), h("div", { class: "acciones" }, acciones));
}

export function vacio(titulo, texto, accion) {
  return h("div", { class: "vacio" }, h("strong", {}, titulo), texto && h("span", {}, texto), accion);
}

export const cargando = (texto = "Cargando…") => h("p", { class: "cargando", role: "status" }, texto);

// columnas: [{ titulo, valor: (fila) => texto | nodo, clase }]
export function tabla(columnas, filas) {
  return h(
    "div",
    { class: "tabla-contenedor" },
    h(
      "table",
      { class: "tabla" },
      h("thead", {}, h("tr", {}, columnas.map((c) => h("th", { class: c.clase, scope: "col" }, c.titulo)))),
      h(
        "tbody",
        {},
        filas.map((fila) =>
          h("tr", {}, columnas.map((c) => h("td", { class: c.clase, "data-etiqueta": c.titulo }, c.valor(fila))))
        )
      )
    )
  );
}

export function indicador(etiqueta, valor, { destacado = false, clase = "" } = {}) {
  return h(
    "div",
    { class: `tarjeta indicador ${destacado ? "destacado" : ""}`.trim() },
    h("span", { class: "etiqueta" }, etiqueta),
    h("span", { class: `valor ${clase}`.trim() }, valor)
  );
}

// ---------- avisos ----------
function contenedorAvisos() {
  let caja = document.querySelector(".avisos");
  if (!caja) {
    caja = h("div", { class: "avisos", role: "status", "aria-live": "polite" });
    document.body.append(caja);
  }
  return caja;
}

export function avisar(mensaje, tipo = "exito") {
  const aviso = h("div", { class: `aviso ${tipo}` }, mensaje);
  contenedorAvisos().append(aviso);
  setTimeout(() => aviso.remove(), 4200);
}

export function avisarError(error) {
  avisar(error.errores ? error.errores.join(" ") : error.message, "error");
}

// ---------- dialogo ----------
// contenido recibe la funcion cerrar para que el formulario cierre el dialogo al guardar
export function abrirDialogo(titulo, contenido) {
  const cerrar = () => dialogo.close();
  const dialogo = h(
    "dialog",
    { class: "dialogo", "aria-label": titulo },
    h(
      "div",
      { class: "dialogo-cabecera" },
      h("h2", {}, titulo),
      h("button", { type: "button", class: "cerrar", "aria-label": "Cerrar", onclick: cerrar }, "×")
    ),
    h("div", { class: "dialogo-cuerpo" }, typeof contenido === "function" ? contenido(cerrar) : contenido)
  );

  dialogo.addEventListener("close", () => dialogo.remove());
  // clic en el fondo oscuro cierra el dialogo
  dialogo.addEventListener("click", (e) => {
    if (e.target === dialogo) cerrar();
  });

  document.body.append(dialogo);
  dialogo.showModal();
  return { cerrar, dialogo };
}

export function confirmar({ titulo, mensaje, textoBoton = "Confirmar", peligro = false }) {
  return new Promise((resolver) => {
    let respuesta = false;
    const { dialogo } = abrirDialogo(titulo, (cerrarDialogo) =>
      h(
        "div",
        { class: "formulario" },
        h("p", {}, mensaje),
        h(
          "div",
          { class: "dialogo-pie" },
          boton("Volver", { clase: "secundario", onclick: cerrarDialogo }),
          boton(textoBoton, {
            clase: peligro ? "peligro" : "acento",
            onclick: () => {
              respuesta = true;
              cerrarDialogo();
            },
          })
        )
      )
    );
    dialogo.addEventListener("close", () => resolver(respuesta));
  });
}
