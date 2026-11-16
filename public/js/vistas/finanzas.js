// vista de finanzas: balance por rango, movimientos, ingresos, egresos y pago de mensualidades
import * as api from "../api.js";
import { obtenerCatalogos, selectorCliente } from "../estado.js";
import {
  h, boton, tabla, vacio, cargando, indicador, etiquetaEstado, formatoFecha, formatoMoneda,
  rangoDelMes, hoy, capitalizar, nombreCompleto, avisar, avisarError,
} from "../ui.js";
import { abrirFormulario } from "../formularios.js";

export async function render(contenedor) {
  const [clientes, { categoriasIngreso, categoriasEgreso }] = await Promise.all([api.clientes.listar(), obtenerCatalogos()]);

  const rango = rangoDelMes();
  const desde = h("input", { type: "date", id: "finanzas-desde", class: "control", value: rango.desde });
  const hasta = h("input", { type: "date", id: "finanzas-hasta", class: "control", value: rango.hasta });
  const selector = selectorCliente(clientes, () => cargar(), { etiqueta: "Cliente", permitirTodos: true });
  const panel = h("div", { class: "pila" });

  desde.addEventListener("change", () => cargar());
  hasta.addEventListener("change", () => cargar());

  const opcionesClientes = clientes.map((c) => ({ valor: c.id, texto: nombreCompleto(c) }));

  function abrirMovimiento(tipo) {
    const ingreso = tipo === "ingreso";
    abrirFormulario(ingreso ? "Registrar ingreso" : "Registrar egreso", {
      textoEnviar: "Guardar",
      valores: { fecha: hoy(), cliente_id: selector.valor() },
      campos: [
        { nombre: "categoria", etiqueta: "Categoría", tipo: "select", requerido: true, opciones: (ingreso ? categoriasIngreso : categoriasEgreso).map((c) => ({ valor: c, texto: capitalizar(c) })) },
        { nombre: "monto", etiqueta: "Monto (Q)", tipo: "number", requerido: true, min: "0.01", step: "0.01" },
        { nombre: "fecha", etiqueta: "Fecha", tipo: "date", requerido: true },
        {
          nombre: "cliente_id",
          etiqueta: ingreso ? "Cliente" : "Cliente (opcional)",
          tipo: "select",
          requerido: ingreso,
          textoVacio: ingreso ? "Selecciona…" : "Sin cliente",
          opciones: opcionesClientes,
          ayuda: ingreso ? "Los ingresos siempre se asocian a un cliente." : undefined,
        },
        { nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea", requerido: true, maxlength: 500, completo: true },
      ],
      alEnviar: async (datos) => {
        await api.finanzas.registrar({ ...datos, tipo });
        avisar(ingreso ? "Ingreso registrado." : "Egreso registrado.");
        await cargar();
      },
    });
  }

  async function abrirPago() {
    const clienteId = selector.valor();
    if (!clienteId) {
      avisar("Elige un cliente en el filtro para registrar su mensualidad.", "error");
      document.getElementById("selector-cliente").focus();
      return;
    }

    try {
      const activos = (await api.contratos.listarPorCliente(clienteId)).filter((c) => c.estado === "activo");
      if (activos.length === 0) {
        avisar("Este cliente no tiene contratos activos para cobrar.", "error");
        return;
      }

      abrirFormulario("Pagar mensualidad", {
        textoEnviar: "Registrar pago",
        valores: { fecha: hoy(), contrato_id: activos.length === 1 ? activos[0].id : "", descripcion: "Pago de mensualidad" },
        campos: [
          {
            nombre: "contrato_id",
            etiqueta: "Contrato",
            tipo: "select",
            requerido: true,
            completo: true,
            opciones: activos.map((c) => ({ valor: c.id, texto: `${c.plan_nombre} · ${formatoMoneda(c.precio)}` })),
            ayuda: "El monto es el precio del contrato.",
          },
          { nombre: "fecha", etiqueta: "Fecha del pago", tipo: "date", requerido: true },
          { nombre: "descripcion", etiqueta: "Descripción", requerido: true, maxlength: 500 },
        ],
        alEnviar: async ({ contrato_id, ...datos }) => {
          const resultado = await api.finanzas.pagarMensualidad(contrato_id, datos);
          avisar(`Pago de ${formatoMoneda(resultado.movimiento.monto)} registrado.`);
          await cargar();
        },
      });
    } catch (error) {
      avisarError(error);
    }
  }

  async function cargar() {
    panel.replaceChildren(cargando());
    const clienteId = selector.valor();

    try {
      const [balance, { movimientos }] = await Promise.all([
        clienteId ? api.finanzas.balanceCliente(clienteId, desde.value, hasta.value) : api.finanzas.balance(desde.value, hasta.value),
        api.finanzas.movimientos(desde.value, hasta.value, clienteId),
      ]);

      const indicadores = h(
        "div",
        { class: "rejilla indicadores" },
        indicador("Ingresos", formatoMoneda(balance.ingresos), { clase: "positivo" }),
        indicador("Egresos", formatoMoneda(balance.egresos), { clase: "negativo" }),
        indicador(clienteId ? "Balance del cliente" : "Balance del periodo", formatoMoneda(balance.balance), { destacado: true })
      );

      if (movimientos.length === 0) {
        panel.replaceChildren(indicadores, vacio("Sin movimientos en este periodo", "Cambia el rango de fechas o registra un movimiento."));
        return;
      }

      // los mas recientes primero
      const ordenados = [...movimientos].reverse();
      panel.replaceChildren(
        indicadores,
        tabla(
          [
            { titulo: "Fecha", valor: (m) => formatoFecha(m.fecha) },
            { titulo: "Tipo", valor: (m) => etiquetaEstado(m.tipo) },
            { titulo: "Categoría", valor: (m) => capitalizar(m.categoria) },
            { titulo: "Descripción", valor: (m) => m.descripcion },
            { titulo: "Cliente", valor: (m) => m.cliente_nombre || h("span", { class: "suave" }, "—") },
            {
              titulo: "Monto",
              clase: "numero",
              valor: (m) => h("strong", { class: m.tipo === "ingreso" ? "positivo" : "negativo" }, `${m.tipo === "ingreso" ? "+" : "−"} ${formatoMoneda(m.monto)}`),
            },
          ],
          ordenados
        )
      );
    } catch (error) {
      // un rango invalido (fin antes del inicio) llega como error del servidor
      panel.replaceChildren(vacio("No se pudo consultar el periodo", error.errores ? error.errores.join(" ") : error.message));
    }
  }

  contenedor.append(
    h(
      "div",
      { class: "cabecera" },
      h("p", {}, "Consulta el balance del gimnasio o de un cliente en cualquier periodo y registra ingresos, egresos y mensualidades."),
      h(
        "div",
        { class: "acciones" },
        boton("Pagar mensualidad", { clase: "acento", iconoNombre: "pago", onclick: abrirPago }),
        boton("Ingreso", { clase: "secundario", iconoNombre: "mas", onclick: () => abrirMovimiento("ingreso") }),
        boton("Egreso", { clase: "secundario", iconoNombre: "mas", onclick: () => abrirMovimiento("egreso") })
      )
    ),
    h(
      "div",
      { class: "barra-filtros" },
      h("div", { class: "campo" }, h("label", { for: "finanzas-desde" }, "Desde"), desde),
      h("div", { class: "campo" }, h("label", { for: "finanzas-hasta" }, "Hasta"), hasta),
      selector.campo
    ),
    panel
  );
  await cargar();
}
