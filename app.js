const lineas = datosCSV.trim().split("\n");
const titulos = lineas[0].split(",");
const datos = [];

for (let i = 1; i < lineas.length; i++) {
  const valores = lineas[i].split(",");
  const fila = {};
  for (let j = 0; j < titulos.length; j++) {
    fila[titulos[j]] = valores[j];
  }
  fila.activaciones = Number(fila.activaciones);
  fila.con_recarga = Number(fila.con_recarga);
  fila.monto_recarga = Number(fila.monto_recarga);
  datos.push(fila);
}

const total = datos.reduce((suma, f) => suma + f.activaciones, 0);

function sumarPor(campo, filas = datos) {
  const resultado = {};
    for (const f of filas) {
    resultado[f[campo]] = (resultado[f[campo]] || 0) + f.activaciones;
  }
  return resultado;
}

const porCanal = sumarPor("canal");
let html = "<table><tr><th>Canal</th><th>Activaciones</th><th>Porcentaje</th></tr>";
for (const canal in porCanal) {
  const pct = (porCanal[canal] / total * 100).toFixed(1);
  html += "<tr><td>" + canal + "</td><td>" + porCanal[canal] + "</td><td>" + pct + "%</td></tr>";
}
html += "</table>";
document.getElementById("tabla-canales").innerHTML = html;

const canales = Object.keys(porCanal);
const valores = canales.map(c => porCanal[c]);

new Chart(document.getElementById("grafico-canales"), {
  type: "bar",
  data: {
    labels: canales,
    datasets: [{ label: "Activaciones", data: valores, backgroundColor: "#7b3fe4" }]
  },
    options: { plugins: { title: { display: true, text: "Activaciones por canal (agosto 2026)" } } }
});

const porDia = sumarPor("fecha");
const dias = Object.keys(porDia).sort();
const valoresDia = dias.map(d => porDia[d]);

const media = total / dias.length;
const ordenados = [...valoresDia].sort((a, b) => a - b);
const mediana = (ordenados[14] + ordenados[15]) / 2;
let sumaCuadrados = 0;
for (const v of valoresDia) sumaCuadrados += (v - media) ** 2;
const desviacion = Math.sqrt(sumaCuadrados / (valoresDia.length - 1));
const moda = canales[valores.indexOf(Math.max(...valores))];

document.getElementById("resumen").innerHTML =
  "<p>Total: <strong>" + total + "</strong> · Media diaria: <strong>" + media.toFixed(0) +
  "</strong> · Mediana: <strong>" + mediana + "</strong> · Desviación estándar: <strong>" +
  desviacion.toFixed(0) + "</strong> · Canal más frecuente (moda): <strong>" + moda + "</strong></p>";

  new Chart(document.getElementById("grafico-dias"), {
  type: "line",
  data: {
    labels: dias.map(d => d.slice(8)),
    datasets: [{ label: "Activaciones por día", data: valoresDia, borderColor: "#7b3fe4" }]
  },
    options: { plugins: { title: { display: true, text: "Activaciones por día de agosto" } } }
});
const prepago = [];
const pospago = [];
const pctPospago = {};
let htmlCruz = "<table><tr><th>Canal</th><th>Prepago</th><th>Pospago</th><th>% Pospago</th></tr>";
for (const c of canales) {
  const tipos = sumarPor("tipo_linea", datos.filter(f => f.canal === c));
  const pre = tipos.Prepago || 0;
  const pos = tipos.Pospago || 0;
  prepago.push(pre);
  pospago.push(pos);
  pctPospago[c] = pos / (pre + pos) * 100;
  htmlCruz += "<tr><td>" + c + "</td><td>" + pre + "</td><td>" + pos + "</td><td>" +
    pctPospago[c].toFixed(1) + "%</td></tr>";
}
htmlCruz += "</table>";
document.getElementById("tabla-cruzada").innerHTML = htmlCruz;

new Chart(document.getElementById("grafico-cruzado"), {
  type: "bar",
  data: {
    labels: canales,
    datasets: [
      { label: "Prepago", data: prepago, backgroundColor: "#eb6834" },
      { label: "Pospago", data: pospago, backgroundColor: "#7b3fe4" }
    ]
  },
    options: {
    plugins: { title: { display: true, text: "Prepago y pospago por canal" } },
    scales: { x: { stacked: true }, y: { stacked: true } }
  }
});

const nombresSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const sumaSemana = [0, 0, 0, 0, 0, 0, 0];
const cuentaSemana = [0, 0, 0, 0, 0, 0, 0];
for (const d of dias) {
  const numero = new Date(d + "T00:00:00").getDay();
  sumaSemana[numero] += porDia[d];
  cuentaSemana[numero] += 1;
}
const promedioSemana = sumaSemana.map((s, i) => Math.round(s / cuentaSemana[i]));

new Chart(document.getElementById("grafico-semana"), {
  type: "bar",
  data: {
    labels: nombresSemana,
    datasets: [{ label: "Promedio de activaciones", data: promedioSemana, backgroundColor: "#7b3fe4" }]
  },
    options: { plugins: { title: { display: true, text: "Promedio de activaciones por día de la semana" } } }
});

const canalesGrandes = canales.filter(c => porCanal[c] >= 100);
const canalPospago = canalesGrandes.reduce((a, b) => pctPospago[a] > pctPospago[b] ? a : b);
const mejorDia = nombresSemana[promedioSemana.indexOf(Math.max(...promedioSemana))];
document.getElementById("interpretacion-diagnostica").textContent =
  "Interpretación: " + moda + " vende sobre todo prepago (solo " + pctPospago[moda].toFixed(1) +
  "% pospago). " + canalPospago + " es el canal con más pospago (" +
  pctPospago[canalPospago].toFixed(1) + "%). El día más fuerte de la semana es " + mejorDia + ".";

  const n = valoresDia.length;
const xs = valoresDia.map((_, i) => i + 1);
const mediaX = xs.reduce((a, b) => a + b, 0) / n;
let num = 0, den = 0;
for (let i = 0; i < n; i++) {
  num += (xs[i] - mediaX) * (valoresDia[i] - media);
  den += (xs[i] - mediaX) ** 2;
}
const pendiente = num / den;
const intercepto = media - pendiente * mediaX;

const diasSeptiembre = [];
const etiquetasPron = [];
for (let x = n + 1; x <= n + 30; x++) {
  diasSeptiembre.push(Math.max(0, Math.round(pendiente * x + intercepto)));
}
for (let x = 1; x <= n + 30; x++) etiquetasPron.push(x);
const totalSeptiembre = diasSeptiembre.reduce((a, b) => a + b, 0);

document.getElementById("resumen-prediccion").innerHTML =
  "<p>Tendencia: <strong>" + pendiente.toFixed(2) + "</strong> activaciones más por día. " +
  "Estimado diario de septiembre: <strong>" + Math.round(totalSeptiembre / 30) +
  "</strong>. Estimado total de septiembre: <strong>" + totalSeptiembre + "</strong>.</p>";

new Chart(document.getElementById("grafico-prediccion"), {
  type: "line",
  data: {
    labels: etiquetasPron,
    datasets: [
      { label: "Real (agosto)", data: valoresDia, borderColor: "#7b3fe4" },
      { label: "Pronóstico (septiembre)", data: new Array(n).fill(null).concat(diasSeptiembre),
        borderColor: "#eb6834", borderDash: [6, 4] }
    ]
  },
    options: { plugins: { title: { display: true, text: "Activaciones reales y pronóstico de septiembre" } } }
});

const PRESUPUESTO_BASE = 150000;  // soles (supuesto)
const INGRESO_PREPAGO = 20;       // soles por activación (supuesto)
const INGRESO_POSPAGO = 80;       // soles por activación (supuesto)

const pctPosLider = pctPospago[moda] / 100;
const ingresoPromedio = pctPosLider * INGRESO_POSPAGO + (1 - pctPosLider) * INGRESO_PREPAGO;

function simular(porcentaje) {
  const extra = porCanal[moda] * 0.3 * Math.sqrt(porcentaje / 100);
  const costo = PRESUPUESTO_BASE * porcentaje / 100;
  return { extra: extra, costo: costo, utilidad: extra * ingresoPromedio - costo };
}

let mejorPct = 0;
for (let p = 0; p <= 100; p++) {
  if (simular(p).utilidad > simular(mejorPct).utilidad) mejorPct = p;
}

const deslizador = document.getElementById("deslizador");
function actualizarSimulacion() {
  const p = Number(deslizador.value);
  const r = simular(p);
  document.getElementById("valor-deslizador").textContent = p;
  document.getElementById("resultado-simulacion").innerHTML =
    "<table><tr><th>Activaciones extra</th><th>Costo (S/)</th><th>Utilidad (S/)</th></tr><tr><td>" +
    Math.round(r.extra) + "</td><td>" + Math.round(r.costo) + "</td><td>" +
    Math.round(r.utilidad) + "</td></tr></table>";
  document.getElementById("recomendacion").textContent =
    "Recomendación: reforzar " + moda + " alrededor de " + mejorPct +
    "%, que da la mayor utilidad (con los supuestos indicados).";
}
deslizador.addEventListener("input", actualizarSimulacion);
actualizarSimulacion();