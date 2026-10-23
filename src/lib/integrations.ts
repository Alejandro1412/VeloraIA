import "server-only";
import { isDemoAuth } from "./auth";
import { llmEnabled } from "./agent/llm";
import { whatsappConfigured } from "./channels/whatsapp";
import { voiceConfigured } from "./channels/voice";
import { storageDriver } from "./data/store";

export interface IntegrationStatus {
  key: string;
  name: string;
  connected: boolean;
  detail: string;
  env: string[];
}

export function integrationStatus(): IntegrationStatus[] {
  return [
    {
      key: "db",
      name: "Base de datos",
      connected: storageDriver() === "postgres",
      detail:
        storageDriver() === "postgres"
          ? "Postgres conectado. Los datos son permanentes."
          : "Modo demo en memoria: los datos se reinician cuando el servidor se recicla.",
      env: ["DATABASE_URL"],
    },
    {
      key: "ai",
      name: "IA conversacional (Claude)",
      connected: llmEnabled(),
      detail: llmEnabled()
        ? `Respuestas generadas con ${process.env.AI_MODEL || "claude-haiku-5-5"}, con el motor de reglas como respaldo.`
        : "Usando el motor de reglas en español. Agrega una API key para conversaciones más naturales.",
      env: ["ANTHROPIC_API_KEY", "AI_MODEL"],
    },
    {
      key: "whatsapp",
      name: "WhatsApp Business",
      connected: whatsappConfigured(),
      detail: whatsappConfigured()
        ? "Recibiendo y respondiendo mensajes."
        : "Conecta un número de WhatsApp Cloud API para atender clientes reales.",
      env: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET", "WHATSAPP_REMINDER_TEMPLATE"],
    },
    {
      key: "voice",
      name: "Llamadas de voz (Twilio)",
      connected: voiceConfigured(),
      detail: voiceConfigured() ? "Atendiendo llamadas con voz." : "Conecta un número de Twilio para contestar llamadas.",
      env: ["TWILIO_AUTH_TOKEN"],
    },
    {
      key: "cron",
      name: "Recordatorios automáticos",
      connected: !!process.env.CRON_SECRET,
      detail: process.env.CRON_SECRET
        ? "Recordatorios programados diariamente."
        : "Define CRON_SECRET para activar el envío diario de recordatorios.",
      env: ["CRON_SECRET"],
    },
    {
      key: "auth",
      name: "Acceso al panel",
      connected: !isDemoAuth(),
      detail: isDemoAuth() ? "Usando la contraseña de demostración." : "Contraseña propia configurada.",
      env: ["ADMIN_PASSWORD", "AUTH_SECRET"],
    },
  ];
}
