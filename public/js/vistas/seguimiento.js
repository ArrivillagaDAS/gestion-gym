// vista de seguimiento fisico: progreso del cliente, grafico de peso y registro de avances
import * as api from "../api.js";
import { selectorCliente } from "../estado.js";
import { lineas } from "../graficos.js";
import {
  h, boton, tabla, vacio, cargando, indicador, formatoFecha, hoy,
  avisar, avisarError, confirmar,
} from "../ui.js";
import { abrirFormulario } from "../formularios.js";

const fechaCorta = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", timeZone: "UTC" });
const corta = (texto) => fechaCorta.format(new Date(`${texto}T00:00:00Z`));

function variacion(valor) {
  if (valor === null || valor === undefined) return h("span", { class: "suave" }, "—");
  const redondeado = Math.round(valor * 100) / 100;
  const signo = redondeado > 0 ? "+" : "";
  // bajar de peso suele ser la meta, pero depende del plan: solo se colorea el sentido
  return h("span", { class: redondeado < 0 ? "positivo" : redondeado > 0 ? "negativo" : "suave" }, `${signo}${redondeado} kg`);
}

export async function render(contenedor) {
  const clientes = await api.clientes.listar();
  if (clientes.length === 0) {
    contenedor.append(vacio("Todavía no hay clientes", "Registra un cliente y asígnale un plan para seguir su progreso.", h("a", { class: "boton acento", href: "#/clientes" }, "Ir a clientes")));
    return;
  }

  const panel = h("div", { class: "pila" });
  const botonRegistrar = boton("Registrar avance", { clase: "acento", iconoNombre: "mas", disabled: true });
  const selector = selectorCliente(clientes, cargar);
  let contratosActivos = [];

  botonRegistrar.addEventListener("click", () => {
    abrirFormulario("Registrar avance", {
      textoEnviar: "Guardar avance",
      valores: { fecha: hoy(), contrato_id: contratosActivos.length === 1 ? contratosActivos[0].id : "" },
      campos: [
        { nombre: "contrato_id", etiqueta: "Contrato activo", tipo: "select", requerido: true, completo: true, opciones: contratosActivos.map((c) => ({ valor: c.id, texto: `${c.plan_nombre} (hasta ${formatoFecha(c.fecha_fin)})` })) },
        { nombre: "fecha", etiqueta: "Fecha", tipo: "date", requerido: true, max: hoy() },
        { nombre: "peso", etiqueta: "Peso (kg)", tipo: "number", step: "0.1", min: 1, max: 500 },
        { nombre: "grasa_corporal", etiqueta: "Grasa corporal (%)", tipo: "number", step: "0.1", min: 0, max: 100 },
        { nombre: "medidas", etiqueta: "Medidas", maxlength: 255, placeholder: "Ej. cintura 80 cm" },
        { nombre: "foto", etiqueta: "Foto (enlace)", maxlength: 255, completo: true, placeholder: "Opcional" },
        { nombre: "comentarios", etiqueta: "Comentarios", tipo: "textarea", completo: true },
      ],
      alEnviar: async (datos) => {
        await api.seguimientos.registrar(datos);
        avisar("Avance registrado.");
        await cargar(selector.valor());
      },
    });
  });

  async function eliminar(registro) {
    const seguro = await confirmar({
      titulo: "Eliminar avance",
      mensaje: `Se eliminará el avance del ${formatoFecha(registro.fecha)}. Esta acción no se puede deshacer.`,
      textoBoton: "Eliminar",
      peligro: true,
    });
    if (!seguro) return;
    try {
      await api.seguimientos.eliminar(registro.id);
      avisar("Avance eliminado.");
      await cargar(selector.valor());
    } catch (error) {
      avisarError(error);
    }
  }

  async function cargar(clienteId) {
    botonRegistrar.disabled = true;
    if (!clienteId) {
      panel.replaceChildren(vacio("Elige un cliente", "Selecciona un cliente para ver su evolución física."));
      return;
    }

    panel.replaceChildren(cargando());
    const [progreso, contratos] = await Promise.all([api.seguimientos.progreso(clienteId), api.contratos.listarPorCliente(clienteId)]);
    if (clienteId !== selector.valor()) return;

    contratosActivos = contratos.filter((c) => c.estado === "activo");
    botonRegistrar.disabled = contratosActivos.length === 0;

    const avisoSinContrato =
      contratosActivos.length === 0 &&
      h("p", { class: "nota" }, "Este cliente no tiene contratos activos: puedes consultar su historial, pero no registrar avances nuevos. ", h("a", { href: "#/contratos" }, "Asignar un plan"));

    if (progreso.length === 0) {
      panel.replaceChildren(...[avisoSinContrato, vacio("Sin avances registrados", "Registra la primera medición para empezar a ver el progreso.")].filter(Boolean));
      return;
    }

    const conPeso = progreso.filter((r) => r.peso !== null);
    const ultimo = progreso.at(-1);
    const ultimaGrasa = [...progreso].reverse().find((r) => r.grasa_corporal !== null);
    const cambioTotal = conPeso.length >= 2 ? conPeso.at(-1).peso - conPeso[0].peso : null;

    panel.replaceChildren(
      ...[
        avisoSinContrato,
        h(
          "div",
          { class: "rejilla indicadores" },
          indicador("Peso actual", conPeso.length ? `${conPeso.at(-1).peso} kg` : "—", { destacado: true }),
          indicador("Cambio total", cambioTotal === null ? "—" : variacion(cambioTotal)),
          indicador("Grasa corporal", ultimaGrasa ? `${ultimaGrasa.grasa_corporal} %` : "—"),
          indicador("Último registro", formatoFecha(ultimo.fecha), { clase: "chico" })
        ),
        conPeso.length >= 2 &&
          h(
            "section",
            { class: "tarjeta" },
            h("h2", {}, "Evolución del peso"),
            lineas(conPeso.map((r) => ({ etiqueta: corta(r.fecha), valor: r.peso })), { unidad: " kg", descripcion: `Evolución del peso: de ${conPeso[0].peso} a ${conPeso.at(-1).peso} kg` })
          ),
        tabla(
          [
            { titulo: "Fecha", valor: (r) => h("strong", {}, formatoFecha(r.fecha)) },
            { titulo: "Plan", valor: (r) => r.plan_nombre },
            { titulo: "Peso", clase: "numero", valor: (r) => (r.peso === null ? "—" : `${r.peso} kg`) },
            { titulo: "Variación", clase: "numero", valor: (r) => variacion(r.variacion_peso) },
            { titulo: "Grasa", clase: "numero", valor: (r) => (r.grasa_corporal === null ? "—" : `${r.grasa_corporal} %`) },
            { titulo: "Medidas", valor: (r) => r.medidas || "—" },
            { titulo: "Comentarios", valor: (r) => h("span", { class: "suave" }, r.comentarios || "—") },
            {
              titulo: "Acciones",
              clase: "acciones",
              valor: (r) =>
                r.contrato_estado === "activo"
                  ? boton("Eliminar", { clase: "secundario chico", iconoNombre: "borrar", "aria-label": `Eliminar avance del ${formatoFecha(r.fecha)}`, onclick: () => eliminar(r) })
                  : h("span", { class: "suave" }, "Historial"),
            },
          ],
          [...progreso].reverse()
        ),
      ].filter(Boolean)
    );
  }

  contenedor.append(
    h("div", { class: "cabecera" }, h("p", {}, "Registra peso, grasa corporal y medidas semana a semana. Los avances de contratos cerrados se conservan como historial."), h("div", { class: "acciones" }, botonRegistrar)),
    h("div", { class: "barra-filtros" }, selector.campo),
    panel
  );
  await cargar(selector.inicial);
}
