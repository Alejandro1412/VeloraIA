# Velora · Recepcionista IA para negocios con citas

Un producto de **IONEX**. Velora contesta WhatsApp y llamadas las 24 horas, agenda citas en el horario real del negocio, envía recordatorios, reprograma y cancela, y le pasa la conversación al equipo humano cuando hace falta.

## Qué incluye

| Parte | Ruta | Descripción |
|---|---|---|
| Sitio comercial | `/` | Landing con animaciones de scroll (GSAP ScrollTrigger + Lenis + SplitText), demo en vivo, calculadora de ahorro y planes. |
| Panel del negocio | `/app` | Resumen, agenda semanal, conversaciones con toma de control humana, servicios y ajustes. |
| Chat web | `POST /api/chat` | El mismo agente que atiende WhatsApp y voz. |
| WhatsApp | `/api/whatsapp/webhook` | WhatsApp Business Cloud API de Meta, con verificación de firma. |
| Voz | `POST /api/voice` | Twilio Programmable Voice con reconocimiento de voz en español. |
| Recordatorios | `GET /api/cron/reminders` | Vercel Cron diario (8:00 a. m. Bogotá), idempotente. |
| Salud | `GET /api/health` | Estado de las integraciones. |

## Cómo funciona por dentro

```
src/lib/domain/        Lógica pura y probada (sin I/O)
  availability.ts      Motor de disponibilidad: horarios, pausas, capacidad, anticipación
  nlu.ts               Comprensión de español: fechas ("el lunes", "28/10"), horas ("a las 3"), servicios
  receptionist.ts      Máquina de estados conversacional: agendar, mover, cancelar, confirmar, info, traspaso
src/lib/agent/         Orquestador por canal + agente con Claude (tool use) con respaldo automático en reglas
src/lib/booking.ts     Único punto que modifica la agenda; revalida disponibilidad bajo bloqueo
src/lib/data/          Repositorio documental: Postgres (Neon) o memoria, sin migraciones manuales
src/app/               App Router de Next.js 16 con Cache Components y Server Actions
```

**Dos motores de conversación.** Sin API key, Velora usa un motor de reglas en español que agenda de verdad. Con `ANTHROPIC_API_KEY`, usa Claude con herramientas tipadas (`get_available_slots`, `book_appointment`, ...) que pasan por las mismas validaciones. Si el modelo falla, responde el motor de reglas.

## Correr en local

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas del motor de agenda y del agente
```

Sin variables de entorno arranca en **modo demo**: datos de ejemplo en memoria y contraseña del panel `velora2026`.

## Poner en producción para un cliente

1. **Base de datos:** crea una base Postgres en Neon (o Vercel Postgres desde el Marketplace) y define `DATABASE_URL`. La tabla se crea sola. Usa `SEED_DEMO=false` para empezar vacío.
2. **Acceso:** define `ADMIN_PASSWORD` y `AUTH_SECRET` (`openssl rand -base64 32`).
3. **IA:** define `ANTHROPIC_API_KEY` (opcional `AI_MODEL`).
4. **WhatsApp:** en Meta for Developers crea una app de WhatsApp, registra el webhook `https://TU-DOMINIO/api/whatsapp/webhook` con tu `WHATSAPP_VERIFY_TOKEN`, suscríbete a `messages` y define `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_APP_SECRET`. Para recordatorios fuera de la ventana de 24 h, aprueba una plantilla con 4 variables (nombre, servicio, día, hora) y ponla en `WHATSAPP_REMINDER_TEMPLATE`.
5. **Voz (opcional):** en Twilio apunta "A call comes in" a `https://TU-DOMINIO/api/voice` (POST) y define `TWILIO_AUTH_TOKEN`.
6. **Recordatorios:** define `CRON_SECRET`. El cron ya está en `vercel.json`.

Todas las variables están documentadas en `.env.example`.

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript estricto · Tailwind CSS 4 · GSAP 3 (ScrollTrigger, SplitText) · Lenis · Motion · Zod · jose · Neon serverless Postgres.
