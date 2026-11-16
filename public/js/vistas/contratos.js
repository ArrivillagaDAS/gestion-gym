// vista de contratos: asignar plan a un cliente y renovar, finalizar o cancelar sus contratos
import * as api from "../api.js";
import { selectorCliente } from "../estado.js";
import {
  h, boton, tabla, vacio, cargando, etiquetaEstado, formatoFecha, formatoMoneda,
  nombreCompleto, avisar, avisarError, confirmar,
} from "../ui.js";
import { abrirFormulario } from "../formularios.js";

export async function render(contenedor) {
  const [clientes, planes] = await Promise.all([api.clientes.listar(), api.planes.listar()]);

  if (clientes.length === 0 || planes.length === 0) {
    contenedor.append(
      vacio(
        "Faltan datos para crear contratos",
        "Se necesita al menos un cliente y un plan registrados.",
        h("a", { class: "boton acento", href: clientes.length === 0 ? "#/clientes" : "#/planes" }, clientes.length === 0 ? "Ir a clientes" : "Ir a planes")
      )
    );
    return;
  }

  const lista = h("div");
  const selector = selectorCliente(clientes, cargar);

  function abrirAsignar() {
    abrirFormulario("Asignar plan", {
      textoEnviar: "Crear contrato",
      columnas: 1,
      valores: { cliente_id: selector.valor() },
      campos: [
        { nombre: "cliente_id", etiqueta: "Cliente", tipo: "select", requerido: true, opciones: clientes.map((c) => ({ valor: c.id, texto: nombreCompleto(c) })) },
        {
          nombre: "plan_id",
          etiqueta: "Plan",
          tipo: "select",
          requerido: true,
          opciones: planes.map((p) => ({ valor: p.id, texto: `${p.nombre} · ${p.duracion_semanas} semanas · ${formatoMoneda(p.precio)}` })),
          ayuda: "El contrato empieza hoy y su vigencia se calcula con la duración del plan.",
        },
        { nombre: "condiciones", etiqueta: "Condiciones adicionales", tipo: "textarea", placeholder: "Opcional" },
      ],
      alEnviar: async (datos) => {
        const resultado = await api.contratos.asignar(datos);
        avisar(`Contrato creado: vigente del ${formatoFecha(resultado.contrato.fecha_inicio)} al ${formatoFecha(resultado.contrato.fecha_fin)}.`);
        const select = document.getElementById("selector-cliente");
        if (select.value !== datos.cliente_id) {
          select.value = datos.cliente_id;
          select.dispatchEvent(new Event("change"));
        } else {
          await cargar(datos.cliente_id);
        }
      },
    });
  }

  async function accion(contrato, tipo) {
    const textos = {
      renovar: {
        titulo: "Renovar contrato",
        mensaje: `Se finalizará este contrato y se creará uno nuevo del plan “${contrato.plan_nombre}” que empieza el ${formatoFecha(contrato.fecha_fin)}.`,
        boton: "Renovar",
      },
      finalizar: {
        titulo: "Finalizar contrato",
        mensaje: "El contrato pasará a finalizado. Su seguimiento físico se conserva como historial.",
        boton: "Finalizar",
      },
      cancelar: { titulo: "Cancelar contrato", boton: "Cancelar contrato", peligro: true },
    }[tipo];

    try {
      if (tipo === "cancelar") {
        const { total } = await api.contratos.contarSeguimientos(contrato.id);
        textos.mensaje =
          total > 0
            ? `Se cancelará el contrato y se eliminarán ${total} ${total === 1 ? "registro" : "registros"} de seguimiento físico. Esta acción no se puede deshacer.`
            : "Se cancelará el contrato. Esta acción no se puede deshacer.";
      }

      const seguro = await confirmar({ titulo: textos.titulo, mensaje: textos.mensaje, textoBoton: textos.boton, peligro: textos.peligro });
      if (!seguro) return;

      await api.contratos[tipo](contrato.id);
      avisar({ renovar: "Contrato renovado.", finalizar: "Contrato finalizado.", cancelar: "Contrato cancelado." }[tipo]);
      await cargar(selector.valor());
    } catch (error) {
      avisarError(error);
    }
  }

  async function cargar(clienteId) {
    if (!clienteId) {
      lista.replaceChildren(vacio("Elige un cliente", "Selecciona un cliente para ver su historial de contratos."));
      return;
    }

    lista.replaceChildren(cargando());
    const contratos = await api.contratos.listarPorCliente(clienteId);
    if (clienteId !== selector.valor()) return;

    if (contratos.length === 0) {
      lista.replaceChildren(vacio("Este cliente no tiene contratos", "Asígnale un plan para empezar.", boton("Asignar plan", { clase: "acento", iconoNombre: "mas", onclick: abrirAsignar })));
      return;
    }

    lista.replaceChildren(
      tabla(
        [
          { titulo: "Plan", valor: (c) => h("strong", {}, c.plan_nombre) },
          { titulo: "Vigencia", valor: (c) => `${formatoFecha(c.fecha_inicio)} → ${formatoFecha(c.fecha_fin)}` },
          { titulo: "Precio", clase: "numero", valor: (c) => formatoMoneda(c.precio) },
          { titulo: "Estado", valor: (c) => etiquetaEstado(c.estado) },
          { titulo: "Condiciones", valor: (c) => h("span", { class: "suave" }, c.condiciones || "—") },
          {
            titulo: "Acciones",
            clase: "acciones",
            valor: (c) =>
              c.estado === "activo"
                ? [
                    boton("Renovar", { clase: "secundario chico", iconoNombre: "renovar", onclick: () => accion(c, "renovar") }),
                    boton("Finalizar", { clase: "secundario chico", onclick: () => accion(c, "finalizar") }),
                    boton("Cancelar", { clase: "secundario chico", iconoNombre: "cerrar", onclick: () => accion(c, "cancelar") }),
                  ]
                : h("span", { class: "suave" }, "Historial"),
          },
        ],
        contratos
      )
    );
  }

  contenedor.append(
    h(
      "div",
      { class: "cabecera" },
      h("p", {}, "Cada contrato une a un cliente con un plan. Solo los contratos activos admiten pagos, avances y planes de alimentación."),
      h("div", { class: "acciones" }, boton("Asignar plan", { clase: "acento", iconoNombre: "mas", onclick: abrirAsignar }))
    ),
    h("div", { class: "barra-filtros" }, selector.campo),
    lista
  );
  await cargar(selector.inicial);
}
