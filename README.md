# Velora · Recepcionista IA para negocios con citas

Un producto de **IONEX**. Velora contesta WhatsApp y llamadas las 24 horas, agenda citas en el horario real del negocio, envía recordatorios, reprograma y cancela, y le pasa la conversación al equipo humano cuando hace falta.

## Qué incluye

| Parte | Ruta | Descripción |
|---|---|---|
| Sitio comercial | `/` | Landing con animaciones de scroll (GSAP ScrollTrigger + Lenis + SplitText), demo en vivo, calculadora de ahorro y planes. |
| Registro e inicio de sesión | `/registro`, `/login` | Cada negocio crea su cuenta con correo y contraseña o con Google. |
| Panel del negocio | `/app` | Resumen, agenda semanal por profesional, conversaciones con toma de control humana, clientes (historial, notas, CSV), servicios (días, descanso, anticipo), profesionales y días cerrados, equipo con roles, avisos, plan y pagos, ajustes. Cada cuenta ve solo sus datos. |
| Invitaciones y recuperación | `/invitacion/<token>`, `/recuperar` | Enlaces de un solo uso para sumar al equipo (rol "Equipo") y restablecer la contraseña por correo. |
| Anticipos y suscripción | `/pagar/...`, `POST /api/wompi/webhook` | Wompi: anticipos con las llaves de cada negocio y cobro mensual de IONEX, con firma verificada e idempotencia. |
| Calendario | `/api/calendar/<token>.ics` | Feed iCalendar para suscribirse desde Google Calendar, Outlook o Apple (opcional `?staff=`). |
| Cita del cliente | `/cita/<negocio>/<cita>/<firma>` | Enlace personal (firmado) para confirmar, mover o cancelar sin escribir. Va en la confirmación y en el recordatorio, que además trae botones de WhatsApp. |
| Encuesta | `/opinion/<negocio>/<cita>/<firma>` | 1–5 estrellas tras la cita. Con 4–5 invita a reseñar en Google; con 1–3 pide el comentario y avisa al dueño. |
| Informe mensual | `/app/informe` | Citas, ingresos, inasistencia, lo que agendó la recepcionista y fuera de horario. Se envía por correo el día 1. |
| Campañas | `/app/campanas` | Mensajes a clientes inactivos (3, 6 o 12 meses), por WhatsApp o con enlaces listos para enviar a mano. |
| Asistente inicial | `/app/bienvenida` | Configuración guiada al registrarse: negocio, horario, servicios, equipo y enlace. |
| Administración IONEX | `/admin` | Todos los negocios: ingreso mensual, pruebas, vencimientos, uso e inactividad; extender prueba, registrar pago manual o pausar. Acceso con `IONEX_ADMIN_EMAILS`. |
| Próximo control | Servicios + `/app/campanas` | Cada servicio puede tener "volver en N meses"; el cron le escribe al cliente cuando le toca. |
| Formulario previo | `/app/formulario` | Preguntas por negocio (plantillas por tipo); el cliente las responde en el enlace de su cita. |
| Caja | `/app/caja` | Pagos registrados al atender, anticipos de Wompi, total por medio de pago y Excel del día. |
| App instalable | `manifest`, `sw.js`, `/api/push` | Se instala en el celular; notificaciones push con llaves VAPID derivadas del secreto del servidor. |
| Sedes | `/app/sedes` | Varias sedes con la misma cuenta y cambio rápido entre ellas. |
| Páginas por tipo | `/para/<tipo>` | Landing para odontología, estética, veterinaria, fisioterapia, barbería, consultorios y talleres. |
| Botón para sitios web | `/widget.js` | `<script src=".../widget.js" data-business="<id>" async>` abre la reserva en un panel flotante. |
| Página de reservas | `/reservar/<id>` | Enlace público de cada negocio para que sus clientes agenden con Sofía. |
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

Sin variables de entorno arranca en **modo demo**: los datos viven en memoria y hay una clínica de demostración accesible desde "Ver la demo del panel" en `/login`.

## Cuentas y multi-negocio

- Cada registro crea un **usuario** y un **negocio** con servicios iniciales según su tipo (odontología, spa, veterinaria…).
- Todos los datos (agenda, clientes, conversaciones, ajustes) se guardan con el ID del negocio y `src/lib/data/store.ts` filtra siempre por el negocio activo, que sale de la sesión o del canal (`withBusiness`).
- Contraseñas con scrypt; sesión en cookie httpOnly firmada (JWT HS256).
- Google: OAuth 2.0 con PKCE, `state` y `nonce`; el `id_token` se verifica contra las llaves públicas de Google. Si el correo ya existe, se vincula a esa cuenta.

### Activar "Continuar con Google"

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crea un proyecto, configura la pantalla de consentimiento (tipo *Externo*) y crea un **ID de cliente OAuth** de tipo *Aplicación web*.
2. En *URIs de redirección autorizados* agrega `https://TU-DOMINIO/api/auth/google/callback`.
3. Copia el *ID de cliente* y el *Secreto* en Vercel como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` y vuelve a desplegar.

## Poner en producción para un cliente

1. **Base de datos (obligatoria para cuentas reales):** crea una base Postgres en Neon desde *Storage* en Vercel; define `DATABASE_URL` automáticamente. La tabla se crea sola.
2. **Sesiones:** opcionalmente define `AUTH_SECRET` (`openssl rand -base64 32`).
3. **IA:** define `ANTHROPIC_API_KEY` (opcional `AI_MODEL`).
4. **WhatsApp:** en Meta for Developers crea la app de WhatsApp de IONEX, registra el webhook `https://TU-DOMINIO/api/whatsapp/webhook` con tu `WHATSAPP_VERIFY_TOKEN`, suscríbete a `messages` y define `WHATSAPP_TOKEN` y `WHATSAPP_APP_SECRET`. Cada negocio escribe el *ID de su número* en Ajustes y los mensajes a ese número llegan a su panel. Para recordatorios fuera de la ventana de 24 h, aprueba una plantilla con 4 variables (nombre, servicio, día, hora) y ponla en `WHATSAPP_REMINDER_TEMPLATE`.
5. **Voz (opcional):** en Twilio apunta "A call comes in" a `https://TU-DOMINIO/api/voice?b=<ID del negocio>` (POST) y define `TWILIO_AUTH_TOKEN`.
6. **Recordatorios y reseñas:** define `CRON_SECRET`. El cron ya está en `vercel.json`; además de recordar citas, pide una reseña de Google a quien fue atendido si el negocio puso su enlace en Ajustes.
7. **Correos:** crea una cuenta en Resend, verifica tu dominio y define `RESEND_API_KEY` y `EMAIL_FROM`. Sin esto, los avisos quedan solo en el panel y la recuperación de contraseña no envía correo.
8. **Cobro de suscripciones:** define `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET` (cuenta Wompi de IONEX) y registra la URL de eventos `https://TU-DOMINIO/api/wompi/webhook`. Cada negocio tiene 14 días de prueba y 5 de gracia al vencer.

Todas las variables están documentadas en `.env.example`.

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript estricto · Tailwind CSS 4 · GSAP 3 (ScrollTrigger, SplitText) · Lenis · Motion · Zod · jose · Neon serverless Postgres.
