import dayjs from "dayjs";

export const FORMATO_FECHA = "YYYY-MM-DD";

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// una fecha es real si tiene formato AAAA-MM-DD y al leerla y volver a escribirla queda igual
// (2026-02-31 y 0000-01-01 no pasan, dayjs los corrige a otro dia)
export function fechaExiste(texto) {
  return (
    typeof texto === "string" &&
    REGEX_FECHA.test(texto) &&
    dayjs(texto).format(FORMATO_FECHA) === texto
  );
}

// convierte lo que devuelve MySQL (Date o texto) en texto AAAA-MM-DD
// usa la zona horaria local, igual que mysql2, para que el dia no cambie
export function formatearFecha(fecha) {
  if (fecha === null || fecha === undefined) return "";
  if (fecha instanceof Date) return dayjs(fecha).format(FORMATO_FECHA);
  return String(fecha);
}