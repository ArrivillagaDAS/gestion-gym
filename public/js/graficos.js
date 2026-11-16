// graficos simples en SVG, sin librerias
const NS = "http://www.w3.org/2000/svg";

function svg(etiqueta, atributos = {}, texto) {
  const nodo = document.createElementNS(NS, etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, valor);
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

// puntos: [{ etiqueta, valor }] en orden cronologico
export function lineas(puntos, { unidad = "", descripcion = "Gráfico de evolución" } = {}) {
  const ancho = 640;
  const alto = 220;
  const margen = { arriba: 18, derecha: 16, abajo: 30, izquierda: 44 };
  const util = { x: ancho - margen.izquierda - margen.derecha, y: alto - margen.arriba - margen.abajo };

  const valores = puntos.map((p) => p.valor);
  let minimo = Math.min(...valores);
  let maximo = Math.max(...valores);
  // un poco de aire arriba y abajo para que la linea no toque los bordes
  const holgura = Math.max((maximo - minimo) * 0.15, 0.5);
  minimo -= holgura;
  maximo += holgura;

  const x = (i) => margen.izquierda + (puntos.length === 1 ? util.x / 2 : (i / (puntos.length - 1)) * util.x);
  const y = (v) => margen.arriba + (1 - (v - minimo) / (maximo - minimo)) * util.y;

  const raiz = svg("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: "grafico", role: "img", "aria-label": descripcion });

  // lineas guia con su valor
  for (let i = 0; i <= 3; i++) {
    const valor = minimo + ((maximo - minimo) * i) / 3;
    const altura = y(valor);
    raiz.append(
      svg("line", { x1: margen.izquierda, x2: ancho - margen.derecha, y1: altura, y2: altura, class: "guia" }),
      svg("text", { x: margen.izquierda - 8, y: altura + 4, class: "eje", "text-anchor": "end" }, valor.toFixed(1))
    );
  }

  const trazo = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = `${trazo} L${x(puntos.length - 1).toFixed(1)},${alto - margen.abajo} L${x(0).toFixed(1)},${alto - margen.abajo} Z`;
  raiz.append(svg("path", { d: area, class: "area" }), svg("path", { d: trazo, class: "linea" }));

  // con muchos puntos solo se rotulan algunos dias para que no se encimen
  const cada = Math.ceil(puntos.length / 6);
  puntos.forEach((p, i) => {
    const punto = svg("circle", { cx: x(i), cy: y(p.valor), r: 4.5, class: "punto" });
    punto.append(svg("title", {}, `${p.etiqueta}: ${p.valor}${unidad}`));
    raiz.append(punto);
    if (i % cada === 0 || i === puntos.length - 1) {
      raiz.append(svg("text", { x: x(i), y: alto - 8, class: "eje", "text-anchor": "middle" }, p.etiqueta));
    }
  });

  return raiz;
}
