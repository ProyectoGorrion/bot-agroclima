require('dotenv').config()

const axios = require("axios")
const TelegramBot = require("node-telegram-bot-api")
const cron = require("node-cron")

const TOKEN = process.env.TELEGRAM_TOKEN
const CANAL = process.env.TELEGRAM_CANAL
const APIKEY = process.env.WU_API_KEY

const bot = new TelegramBot(TOKEN)

console.log("Sistema Agroclimático GORRIÓN-01 iniciado 🌱")

// MEMORIA ALERTAS
let memoriaAlertas = {
helada:0,
estres:0,
incendio:0
}

const HORAS_BLOQUEO = 6

// HISTORIAL DEL DIA
let historialDia = {
tempMax:-100,
tempMin:100,
radiacionMax:0,
uvMax:0,
lluviaTotal:0
}



async function obtenerClima(){

try{

const url=`https://api.weather.com/v2/pws/observations/current?stationId=IOZUMB2&format=json&units=m&apiKey=${APIKEY}`

const res=await axios.get(url)

const obs=res.data.observations[0]

const datos={

temp:obs.metric.temp,
humedad:obs.humidity,
viento:obs.metric.windSpeed,
lluvia:obs.metric.precipTotal||0,
presion:obs.metric.pressure,
uv:obs.uv||0,
radiacion:obs.solarRadiation||0,
rocio:obs.metric.dewpt

}

actualizarHistorial(datos)

return datos

}catch(error){

console.log("ERROR clima:",error.response?.data||error.message)
return null

}

}



function actualizarHistorial(datos){

if(datos.temp>historialDia.tempMax) historialDia.tempMax=datos.temp
if(datos.temp<historialDia.tempMin) historialDia.tempMin=datos.temp
if(datos.radiacion>historialDia.radiacionMax) historialDia.radiacionMax=datos.radiacion
if(datos.uv>historialDia.uvMax) historialDia.uvMax=datos.uv

historialDia.lluviaTotal=datos.lluvia

}



function interpretarCondiciones(datos){

let texto=""

if(datos.temp<=6) texto="Ambiente frío con probabilidad de rocío."
else if(datos.temp<=15) texto="Condiciones frescas y estables."
else if(datos.temp<=28) texto="Condiciones templadas favorables para labores agrícolas."
else texto="Ambiente caluroso con posible estrés hídrico en cultivos."

if(datos.humedad>=85) texto+=" La humedad elevada favorece la presencia de rocío."
if(datos.viento<=5) texto+=" Vientos ligeros generan estabilidad atmosférica."

return texto

}



function semaforoAgroclimatico(datos){

let estres="Bajo"
let incendio="Bajo"
let pastoreo="Bueno"

if(datos.temp>=30 && datos.humedad<=40) estres="Alto"
if(datos.humedad<=30 && datos.radiacion>=700) incendio="Alto"
if(datos.humedad>=85) pastoreo="Moderado"

return {estres,incendio,pastoreo}

}



function generarBoletin(datos){

const fecha=new Date()

const fechaTexto=fecha.toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})
const horaTexto=fecha.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})

const interpretacion=interpretarCondiciones(datos)
const semaforo=semaforoAgroclimatico(datos)

return `

📡 Boletín Agroclimático – Región de los Volcanes
📍 Estación GORRIÓN-01
📅 ${fechaTexto}
🕘 ${horaTexto}

──────────────

🌡 Temperatura: ${datos.temp} °C
💧 Humedad: ${datos.humedad} %
🌫 Punto de rocío: ${datos.rocio} °C

🌬 Viento: ${datos.viento} km/h
☀ Radiación solar: ${datos.radiacion} W/m²
🔆 Índice UV: ${datos.uv}

🌧 Precipitación: ${datos.lluvia} mm
📈 Presión atmosférica: ${datos.presion} hPa

──────────────

🔎 Interpretación general
${interpretacion}

──────────────

🚦 Semáforo agroclimático

🌱 Estrés hídrico: ${semaforo.estres}
🔥 Riesgo de incendio forestal: ${semaforo.incendio}
🐄 Condición de pastoreo: ${semaforo.pastoreo}

──────────────

🌱 Recomendaciones agrícolas
• Programar labores temprano o al atardecer.
• Verificar humedad del suelo antes de regar.

🐄 Recomendaciones ganaderas
• Mantener agua disponible para el ganado.
• Evitar pastoreo temprano si hay exceso de humedad.

🌲 Manejo forestal
• Mantener vigilancia en periodos secos.
• Evitar quemas agrícolas sin control.

`

}



function diagnosticoAgroclimatico(){

let estres="Bajo"
let incendio="Bajo"
let trabajo="Buenas"

if(historialDia.tempMax>=30) estres="Moderado"
if(historialDia.tempMax>=34) estres="Alto"

if(historialDia.radiacionMax>=800 && historialDia.lluviaTotal==0) incendio="Alto"

if(historialDia.tempMax>=32) trabajo="Limitadas en horas de calor"

return {estres,incendio,trabajo}

}



function generarResumen(){

const diag=diagnosticoAgroclimatico()

return `

📊 Resumen Agroclimático del Día
Región de los Volcanes

🌡 Temperatura máxima: ${historialDia.tempMax} °C
❄ Temperatura mínima: ${historialDia.tempMin} °C

☀ Radiación máxima: ${historialDia.radiacionMax} W/m²
🔆 UV máximo: ${historialDia.uvMax}

🌧 Lluvia acumulada: ${historialDia.lluviaTotal} mm

──────────────

📈 Diagnóstico del día

🌵 Estrés hídrico observado: ${diag.estres}
🔥 Riesgo de incendio forestal: ${diag.incendio}
⏱ Condiciones para trabajo en campo: ${diag.trabajo}

Fuente:
Sistema de Monitoreo Agroclimático
Universidad Politécnica de Atlautla

`

}



function detectarAlertas(datos){

let alertas=[]
const ahora=Date.now()
const bloqueo=HORAS_BLOQUEO*60*60*1000



if(datos.temp<=3){

if(ahora-memoriaAlertas.helada>bloqueo){

memoriaAlertas.helada=ahora

alertas.push(`❄ ALERTA AGROCLIMÁTICA – HELADA

Temperatura crítica (${datos.temp} °C).`)

}

}



if(datos.temp>=30 && datos.humedad<=40){

if(ahora-memoriaAlertas.estres>bloqueo){

memoriaAlertas.estres=ahora

alertas.push(`🌵 ALERTA – ESTRÉS HÍDRICO

Temperatura alta (${datos.temp} °C) y humedad baja.`)

}

}



if(datos.humedad<=30 && datos.radiacion>=700){

if(ahora-memoriaAlertas.incendio>bloqueo){

memoriaAlertas.incendio=ahora

alertas.push(`🔥 ALERTA – RIESGO DE INCENDIO FORESTAL`)

}

}

return alertas

}



async function enviarBoletin(){

const datos=await obtenerClima()
if(!datos) return

const mensaje=generarBoletin(datos)

await bot.sendMessage(CANAL,mensaje)

}



async function revisarAlertas(){

const datos=await obtenerClima()
if(!datos) return

const alertas=detectarAlertas(datos)

for(const alerta of alertas){

await bot.sendMessage(CANAL,alerta)

}

}



async function enviarResumen(){

const mensaje=generarResumen()

await bot.sendMessage(CANAL,mensaje)

historialDia={
tempMax:-100,
tempMin:100,
radiacionMax:0,
uvMax:0,
lluviaTotal:0
}

}



// BOLETINES
cron.schedule("0 6 * * *",enviarBoletin)
cron.schedule("0 11 * * *",enviarBoletin)
cron.schedule("0 14 * * *",enviarBoletin)
cron.schedule("0 18 * * *",enviarBoletin)

// ALERTAS
cron.schedule("*/30 * * * *",revisarAlertas)

// RESUMEN
cron.schedule("0 22 * * *",enviarResumen)

enviarBoletin()