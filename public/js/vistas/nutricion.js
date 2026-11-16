// vista de nutricion: planes de alimentacion, registro de alimentos y reporte semanal
import * as api from "../api.js";
import { obtenerCatalogos, selectorCliente } from "../estado.js";
import { barras } from "../graficos.js";
import {
  h, boton, vacio, cargando, indicador, etiquetaEstado, formatoFecha, hoy, lunesDe,
  aTextoFecha, capitalizar, avisar,
} from "../ui.js";
import { abrirFormulario } from "../formularios.js";

const diaSemana = new Intl.DateTimeFormat("es-GT", { weekday: "short", day: "numeric", timeZone: "UTC" });
const nombreDia = (texto) => diaSemana.format(new Date(`${texto}T00:00:00Z`));

// numero grande con la unidad en chico, para que quepa en el indicador
const kcal = (valor) => [valor.toLocaleString("es-GT"), h("small", { class: "unidad" }, " kcal")];

function moverSemana(inicio, semanas) {
  const [anio, mes, dia] = inicio.split("-").map(Number);
  return aTextoFecha(new Date(anio, mes - 1, dia + semanas * 7));
}

export async function render(contenedor) {
  const [clientes, { comidas }] = await Promise.all([api.clientes.listar(), obtenerCatalogos()]);
  if (clientes.length === 0) {
    contenedor.append(vacio("Todavía no hay clientes", "Registra un cliente con un contrato activo para armar su plan de alimentación.", h("a", { class: "boton acento", href: "#/clientes" }, "Ir a clientes")));
    return;
  }

  const selector = selectorCliente(clientes, cargar);
  const panel = h("div", { class: "pila" });
  const botonPlan = boton("Nuevo plan", { clase: "secundario", iconoNombre: "mas", disabled: true });
  const botonAlimento = boton("Registrar alimento", { clase: "acento", iconoNombre: "mas", disabled: true });

  let contratosActivos = [];
  let planesAbiertos = [];
  let semana = lunesDe();

  botonPlan.addEventListener("click", () => {
    abrirFormulario("Nuevo plan de alimentación", {
      textoEnviar: "Crear plan",
      valores: { fecha_inicio: hoy(), contrato_id: contratosActivos.length === 1 ? contratosActivos[0].id : "" },
      campos: [
        { nombre: "contrato_id", etiqueta: "Contrato activo", tipo: "select", requerido: true, completo: true, opciones: contratosActivos.map((c) => ({ valor: c.id, texto: `${c.plan_nombre} (hasta ${formatoFecha(c.fecha_fin)})` })) },
        { nombre: "nombre", etiqueta: "Nombre del plan", requerido: true, maxlength: 100, completo: true, placeholder: "Ej. Déficit moderado" },
        { nombre: "fecha_inicio", etiqueta: "Inicio", tipo: "date", requerido: true },
        { nombre: "fecha_fin", etiqueta: "Fin", tipo: "date", ayuda: "Opcional. Debe quedar dentro del contrato." },
      ],
      alEnviar: async (datos) => {
        await api.nutricion.crearPlan(datos);
        avisar("Plan de alimentación creado.");
        await cargar(selector.valor());
      },
    });
  });

  botonAlimento.addEventListener("click", () => {
    abrirFormulario("Registrar alimento", {
      textoEnviar: "Guardar alimento",
      valores: { fecha: hoy(), plan_alimentacion_id: planesAbiertos.length === 1 ? planesAbiertos[0].id : "" },
      campos: [
        { nombre: "plan_alimentacion_id", etiqueta: "Plan de alimentación", tipo: "select", requerido: true, completo: true, opciones: planesAbiertos.map((p) => ({ valor: p.id, texto: p.nombre })) },
        { nombre: "fecha", etiqueta: "Fecha", tipo: "date", requerido: true },
        { nombre: "comida", etiqueta: "Comida", tipo: "select", requerido: true, opciones: comidas.map((c) => ({ valor: c, texto: capitalizar(c) })) },
        { nombre: "alimento", etiqueta: "Alimento", requerido: true, maxlength: 150, completo: true },
        { nombre: "calorias", etiqueta: "Calorías estimadas", tipo: "number", requerido: true, min: 1, max: 10000, step: 1 },
      ],
      alEnviar: async (datos) => {
        await api.nutricion.registrarAlimento(datos);
        avisar("Alimento registrado.");
        semana = lunesDe(new Date(`${datos.fecha}T12:00:00`));
        await cargar(selector.valor());
      },
    });
  });

  function seccionPlanes(planes) {
    return h(
      "section",
      { class: "tarjeta" },
      h("h2", {}, "Planes de alimentación"),
      planes.length === 0
        ? h("p", { class: "suave" }, "Este cliente todavía no tiene planes de alimentación.")
        : h(
            "ul",
            { class: "lista-planes" },
            planes.map((p) =>
              h(
                "li",
                {},
                h("div", {}, h("strong", {}, p.nombre), h("span", { class: "suave" }, ` · ${p.plan_nombre}`)),
                h("span", { class: "suave" }, `${formatoFecha(p.fecha_inicio)} → ${p.fecha_fin ? formatoFecha(p.fecha_fin) : "sin fecha de fin"}`),
                etiquetaEstado(p.contrato_estado)
              )
            )
          )
    );
  }

  async function seccionReporte(clienteId) {
    const reporte = await api.nutricion.reporte(clienteId, semana);

    const navegacion = h(
      "div",
      { class: "acciones" },
      boton("‹ Anterior", { clase: "secundario chico", onclick: async () => { semana = moverSemana(semana, -1); await cargar(clienteId); } }),
      boton("Esta semana", { clase: "secundario chico", onclick: async () => { semana = lunesDe(); await cargar(clienteId); } }),
      boton("Siguiente ›", { clase: "secundario chico", onclick: async () => { semana = moverSemana(semana, 1); await cargar(clienteId); } })
    );

    const detalle = reporte.dias
      .filter((d) => d.alimentos.length > 0)
      .map((d) =>
        h(
          "div",
          { class: "dia-detalle" },
          h("h3", {}, capitalizar(nombreDia(d.fecha)), h("span", { class: "suave" }, ` · ${d.calorias.toLocaleString("es-GT")} kcal`)),
          h("ul", {}, d.alimentos.map((a) => h("li", {}, h("span", { class: "etiqueta-estado" }, capitalizar(a.comida)), ` ${a.alimento}`, h("span", { class: "suave" }, ` · ${a.calorias} kcal`))))
        )
      );

    return h(
      "section",
      { class: "tarjeta pila" },
      h("div", { class: "cabecera sin-margen" }, h("h2", {}, `Semana del ${formatoFecha(reporte.inicio)} al ${formatoFecha(reporte.fin)}`), navegacion),
      h(
        "div",
        { class: "rejilla indicadores" },
        indicador("Total de la semana", kcal(reporte.total), { destacado: true }),
        indicador("Promedio diario", kcal(Math.round(reporte.promedio))),
        indicador("Días con registros", `${reporte.diasConRegistros} de 7`)
      ),
      barras(
        reporte.dias.map((d) => ({ etiqueta: capitalizar(nombreDia(d.fecha)), valor: d.calorias })),
        { unidad: "", descripcion: `Calorías por día de la semana del ${reporte.inicio}` }
      ),
      detalle.length ? h("div", { class: "rejilla detalle-semana" }, detalle) : h("p", { class: "suave" }, "No hay alimentos registrados en esta semana."),
      h("p", { class: "ayuda suave" }, "El promedio se calcula sobre los días que tienen alimentos registrados.")
    );
  }

  async function cargar(clienteId) {
    botonPlan.disabled = true;
    botonAlimento.disabled = true;
    if (!clienteId) {
      panel.replaceChildren(vacio("Elige un cliente", "Selecciona un cliente para ver sus planes y su reporte semanal."));
      return;
    }

    panel.replaceChildren(cargando());
    const [planes, contratos] = await Promise.all([api.nutricion.planes(clienteId), api.contratos.listarPorCliente(clienteId)]);
    const reporte = await seccionReporte(clienteId);
    if (clienteId !== selector.valor()) return;

    contratosActivos = contratos.filter((c) => c.estado === "activo");
    planesAbiertos = planes.filter((p) => p.contrato_estado === "activo");
    botonPlan.disabled = contratosActivos.length === 0;
    botonAlimento.disabled = planesAbiertos.length === 0;

    const nota =
      contratosActivos.length === 0
        ? h("p", { class: "nota" }, "Este cliente no tiene contratos activos: solo puedes consultar su historial. ", h("a", { href: "#/contratos" }, "Asignar un plan"))
        : planesAbiertos.length === 0 && h("p", { class: "nota" }, "Crea un plan de alimentación para poder registrar alimentos.");

    panel.replaceChildren(...[nota, seccionPlanes(planes), reporte].filter(Boolean));
  }

  contenedor.append(
    h("div", { class: "cabecera" }, h("p", {}, "Arma planes de alimentación dentro de los contratos activos y lleva el registro de calorías por día."), h("div", { class: "acciones" }, botonPlan, botonAlimento)),
    h("div", { class: "barra-filtros" }, selector.campo),
    panel
  );
  await cargar(selector.inicial);
}
