// panel de inicio: resumen del mes, accesos rapidos y actividad reciente
import * as api from "../api.js";
import { h, indicador, formatoMoneda, formatoFecha, rangoDelMes, nombreCompleto } from "../ui.js";

const mesActual = new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(new Date());
const hoyLargo = new Intl.DateTimeFormat("es-GT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
// en español solo va mayuscula la primera letra: "Domingo, 15 de noviembre"
const fechaHoy = hoyLargo.charAt(0).toUpperCase() + hoyLargo.slice(1);

const ACCESOS = [
  { href: "#/clientes", titulo: "Registrar cliente", texto: "Da de alta a un nuevo miembro." },
  { href: "#/contratos", titulo: "Asignar plan", texto: "Crea un contrato con su vigencia." },
  { href: "#/seguimiento", titulo: "Registrar avance", texto: "Peso, grasa y medidas de la semana." },
  { href: "#/finanzas", titulo: "Cobrar mensualidad", texto: "Registra el pago de un contrato activo." },
];

export async function render(contenedor) {
  const { desde, hasta } = rangoDelMes();
  const [clientes, balance, { movimientos }] = await Promise.all([
    api.clientes.listar(),
    api.finanzas.balance(desde, hasta),
    api.finanzas.movimientos(desde, hasta),
  ]);

  // la api lista contratos por cliente: se consultan todos para contar los activos
  const contratos = (await Promise.all(clientes.map((c) => api.contratos.listarPorCliente(c.id)))).flat();
  const activos = contratos.filter((c) => c.estado === "activo").length;

  const recientes = [...movimientos].reverse().slice(0, 5);
  const nuevos = [...clientes].sort((a, b) => b.id - a.id).slice(0, 5);

  contenedor.append(
    h(
      "section",
      { class: "bienvenida" },
      h("div", {}, h("p", { class: "bienvenida-fecha" }, fechaHoy), h("h2", {}, `Resumen de ${mesActual}`)),
      h("p", {}, `${activos} ${activos === 1 ? "contrato activo" : "contratos activos"} y un balance de ${formatoMoneda(balance.balance)} en lo que va del mes.`)
    ),
    h(
      "div",
      { class: "rejilla indicadores" },
      indicador("Clientes", String(clientes.length)),
      indicador("Contratos activos", String(activos)),
      indicador("Ingresos del mes", formatoMoneda(balance.ingresos), { clase: "positivo" }),
      indicador("Balance del mes", formatoMoneda(balance.balance), { destacado: true })
    ),
    h(
      "nav",
      { class: "rejilla accesos", "aria-label": "Accesos rápidos" },
      ACCESOS.map((a) => h("a", { class: "tarjeta acceso", href: a.href }, h("strong", {}, a.titulo), h("span", { class: "suave" }, a.texto), h("span", { class: "flecha", "aria-hidden": "true" }, "→")))
    ),
    h(
      "div",
      { class: "rejilla dos-columnas" },
      h(
        "section",
        { class: "tarjeta" },
        h("h2", {}, "Últimos movimientos"),
        recientes.length === 0
          ? h("p", { class: "suave" }, "Todavía no hay movimientos este mes.")
          : h(
              "ul",
              { class: "lista-simple" },
              recientes.map((m) =>
                h(
                  "li",
                  {},
                  h("div", {}, h("strong", {}, m.descripcion), h("span", { class: "suave" }, `${formatoFecha(m.fecha)}${m.cliente_nombre ? ` · ${m.cliente_nombre}` : ""}`)),
                  h("span", { class: m.tipo === "ingreso" ? "positivo" : "negativo" }, `${m.tipo === "ingreso" ? "+" : "−"} ${formatoMoneda(m.monto)}`)
                )
              )
            ),
        h("a", { class: "enlace", href: "#/finanzas" }, "Ver finanzas →")
      ),
      h(
        "section",
        { class: "tarjeta" },
        h("h2", {}, "Clientes recientes"),
        nuevos.length === 0
          ? h("p", { class: "suave" }, "Todavía no hay clientes registrados.")
          : h(
              "ul",
              { class: "lista-simple" },
              nuevos.map((c) =>
                h(
                  "li",
                  {},
                  h("div", {}, h("strong", {}, nombreCompleto(c)), h("span", { class: "suave" }, `Desde ${formatoFecha(c.fecha_registro)}`)),
                  h("span", { class: "suave" }, c.email || c.telefono || "Sin contacto")
                )
              )
            ),
        h("a", { class: "enlace", href: "#/clientes" }, "Ver clientes →")
      )
    )
  );
}
