// vista de planes de entrenamiento: tarjetas filtrables por nivel y alta de planes
import * as api from "../api.js";
import { obtenerCatalogos } from "../estado.js";
import { h, boton, vacio, etiquetaEstado, formatoMoneda, capitalizar, avisar } from "../ui.js";
import { abrirFormulario } from "../formularios.js";

export async function render(contenedor) {
  const [{ niveles }, planesIniciales] = await Promise.all([obtenerCatalogos(), api.planes.listar()]);
  let planes = planesIniciales;
  let filtro = "";

  const resumen = h("p");
  const filtros = h("div", { class: "filtro-chips", role: "group", "aria-label": "Filtrar por nivel" });
  const lista = h("div");

  function abrirNuevo() {
    abrirFormulario("Nuevo plan", {
      textoEnviar: "Crear plan",
      campos: [
        { nombre: "nombre", etiqueta: "Nombre del plan", requerido: true, maxlength: 100, completo: true },
        { nombre: "duracion_semanas", etiqueta: "Duración (semanas)", tipo: "number", requerido: true, min: 1, max: 520, step: 1 },
        { nombre: "precio", etiqueta: "Precio", tipo: "number", requerido: true, min: 0, step: "0.01" },
        { nombre: "nivel", etiqueta: "Nivel", tipo: "select", requerido: true, opciones: niveles.map((n) => ({ valor: n, texto: capitalizar(n) })) },
        { nombre: "metas_fisicas", etiqueta: "Metas físicas", maxlength: 255 },
      ],
      alEnviar: async (datos) => {
        await api.planes.crear(datos);
        avisar("Plan creado.");
        planes = await api.planes.listar();
        pintar();
      },
    });
  }

  function tarjeta(plan) {
    return h(
      "article",
      { class: "tarjeta plan" },
      h("div", { class: "plan-cabecera" }, etiquetaEstado(plan.nivel), h("span", { class: "suave" }, `${plan.duracion_semanas} semanas`)),
      h("h3", {}, plan.nombre),
      h("p", { class: "suave" }, plan.metas_fisicas || "Sin metas físicas registradas."),
      h("p", { class: "plan-precio" }, formatoMoneda(plan.precio), h("span", {}, " por contrato"))
    );
  }

  function pintar() {
    resumen.textContent = `${planes.length} ${planes.length === 1 ? "plan disponible" : "planes disponibles"} para asignar a los clientes.`;

    filtros.replaceChildren(
      ...["", ...niveles].map((nivel) =>
        h(
          "button",
          { type: "button", class: "chip", "aria-pressed": String(filtro === nivel), onclick: () => { filtro = nivel; pintar(); } },
          nivel ? capitalizar(nivel) : "Todos"
        )
      )
    );

    const visibles = planes.filter((p) => !filtro || p.nivel === filtro);
    if (planes.length === 0) {
      lista.replaceChildren(vacio("Todavía no hay planes", "Crea un plan para poder asignarlo en un contrato.", boton("Nuevo plan", { clase: "acento", iconoNombre: "mas", onclick: abrirNuevo })));
    } else if (visibles.length === 0) {
      lista.replaceChildren(vacio("Sin planes en este nivel", "Prueba con otro filtro o crea uno nuevo."));
    } else {
      lista.replaceChildren(h("div", { class: "rejilla tarjetas" }, visibles.map(tarjeta)));
    }
  }

  contenedor.append(
    h("div", { class: "cabecera" }, resumen, h("div", { class: "acciones" }, boton("Nuevo plan", { clase: "acento", iconoNombre: "mas", onclick: abrirNuevo }))),
    filtros,
    lista
  );
  pintar();
}
