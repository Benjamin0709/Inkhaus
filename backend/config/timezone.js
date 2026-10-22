// Todas las fechas del backend (disponibilidad, correos, cron) usan la hora local del proceso.
// Se fija la zona de Chile para que no dependa de la configuración del servidor (normalmente UTC).
process.env.TZ = process.env.APP_TIMEZONE || "America/Santiago";