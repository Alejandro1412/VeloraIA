export interface VerticalPage {
  slug: string;
  vertical: string;
  name: string;
  emoji: string;
  headline: string;
  sub: string;
  pains: { title: string; body: string }[];
  features: { title: string; body: string }[];
  chat: { who: "in" | "out"; text: string }[];
  stat: { value: string; label: string };
}

export const VERTICAL_PAGES: VerticalPage[] = [
  {
    slug: "odontologia",
    vertical: "Odontología",
    name: "Odontologías",
    emoji: "🦷",
    headline: "Tu consultorio agenda limpiezas mientras tú atiendes.",
    sub: "Velora contesta el WhatsApp de tu clínica, ofrece los horarios reales de cada odontólogo, confirma un día antes y te devuelve a los pacientes cuando les toca su control.",
    pains: [
      { title: "El celular suena en plena consulta", body: "No puedes contestar con los guantes puestos, y el paciente agenda en otra clínica." },
      { title: "Sillones vacíos por inasistencias", body: "Un paciente que no llega es una hora perdida del especialista." },
      { title: "Pacientes que no vuelven", body: "Nadie les recuerda la limpieza de cada 6 meses o el control de ortodoncia." },
    ],
    features: [
      { title: "Agenda por odontólogo", body: "Cada especialista con sus servicios, días y horarios." },
      { title: "Control automático", body: "A los 6 meses le escribe al paciente para su limpieza." },
      { title: "Formulario previo", body: "Motivo, alergias y consentimiento antes de llegar." },
      { title: "Anticipos", body: "Cobra el blanqueamiento por adelantado con PSE o Nequi." },
    ],
    chat: [
      { who: "in", text: "Hola, ¿tienen cita para limpieza el viernes?" },
      { who: "out", text: "¡Claro! El viernes tengo 9:00 a. m., 11:30 a. m. y 3:00 p. m. con la Dra. Ana. ¿Cuál te sirve?" },
      { who: "in", text: "La de las 3" },
      { who: "out", text: "¡Listo, quedó agendada! ✅ Te escribo un día antes para confirmar." },
    ],
    stat: { value: "6 meses", label: "y el paciente recibe solo su recordatorio de limpieza" },
  },
  {
    slug: "estetica",
    vertical: "Estética y spa",
    name: "Centros de estética y spa",
    emoji: "💆‍♀️",
    headline: "Tu spa lleno, incluso cuando la recepción está cerrada.",
    sub: "Tus clientas escriben a cualquier hora por WhatsApp o desde tu enlace de reservas. Velora responde al instante, agenda con la esteticista correcta y cobra el anticipo para que no falten.",
    pains: [
      { title: "Mensajes a las 10 de la noche", body: "Las clientas preguntan cuando tú ya cerraste; al otro día ya reservaron en otro lado." },
      { title: "Citas largas que no llegan", body: "Un masaje de 90 minutos sin cliente es mucho dinero perdido." },
      { title: "Paquetes difíciles de seguir", body: "Sesiones de 10, cada semana, con la misma terapeuta." },
    ],
    features: [
      { title: "Paquetes y sesiones", body: "Agenda las 10 sesiones de una vez, a la misma hora." },
      { title: "Anticipo en línea", body: "PSE, Nequi o tarjeta al reservar." },
      { title: "Consentimiento informado", body: "Lo firman en el formulario previo desde su celular." },
      { title: "Reseñas en Google", body: "A las clientas felices les pide la reseña; las quejas te llegan solo a ti." },
    ],
    chat: [
      { who: "in", text: "Hola! cuánto vale el masaje relajante?" },
      { who: "out", text: "¡Hola! 💆‍♀️ El Masaje relajante de 60 min cuesta $140.000. ¿Te lo agendo? Mañana tengo 10:00 a. m. y 4:00 p. m." },
      { who: "in", text: "mañana a las 4" },
      { who: "out", text: "¡Hecho! Para asegurar tu cupo paga el anticipo de $40.000 aquí: (enlace)" },
    ],
    stat: { value: "24/7", label: "respuestas al instante, también de noche" },
  },
  {
    slug: "veterinaria",
    vertical: "Veterinaria",
    name: "Veterinarias",
    emoji: "🐾",
    headline: "Vacunas, baños y consultas agendadas solas.",
    sub: "Velora atiende a los dueños de mascotas por WhatsApp, agenda con el veterinario disponible y recuerda las vacunas y desparasitaciones cuando toca.",
    pains: [
      { title: "Recepción saturada", body: "Llamadas, WhatsApp y personas en el mostrador, todo al mismo tiempo." },
      { title: "Vacunas olvidadas", body: "Los dueños no recuerdan cuándo toca el refuerzo anual." },
      { title: "Datos incompletos", body: "Llegan sin saber la edad, la raza o las vacunas de la mascota." },
    ],
    features: [
      { title: "Recordatorio de vacunas", body: "Cada 12 meses le escribe al dueño para el refuerzo." },
      { title: "Ficha de la mascota", body: "Nombre, especie, raza y edad antes de la consulta." },
      { title: "Baño y peluquería", body: "Agenda con el groomer y avisa cuando toca el próximo." },
      { title: "Urgencias al equipo", body: "Si es urgente, pasa la conversación a una persona." },
    ],
    chat: [
      { who: "in", text: "Buenas, mi perrito necesita la vacuna anual" },
      { who: "out", text: "¡Hola! 🐶 Para Vacunación tengo mañana 9:00 a. m. o el jueves 2:30 p. m. ¿Cuál prefieres?" },
      { who: "in", text: "jueves" },
      { who: "out", text: "¡Listo! Antes de venir, cuéntanos de tu mascota aquí: (enlace) 🐾" },
    ],
    stat: { value: "12 meses", label: "y el dueño recibe solo el aviso de la vacuna" },
  },
  {
    slug: "fisioterapia",
    vertical: "Fisioterapia",
    name: "Centros de fisioterapia",
    emoji: "🦵",
    headline: "Tratamientos de 10 sesiones, agendados en un mensaje.",
    sub: "Velora agenda la serie completa con el mismo fisioterapeuta, recuerda cada sesión y te muestra cuántas lleva cada paciente.",
    pains: [
      { title: "Series difíciles de agendar", body: "Diez sesiones, dos veces por semana, sin cruces." },
      { title: "Pacientes que abandonan", body: "Faltan a la tercera sesión y nadie les escribe." },
      { title: "Órdenes médicas", body: "No sabes de qué viene el paciente hasta que llega." },
    ],
    features: [
      { title: "Citas recurrentes", body: "Cada semana, mismo horario, avisa si alguna fecha está llena." },
      { title: "Sesión 3 de 10", body: "El progreso de cada paciente en la agenda." },
      { title: "Formulario previo", body: "Zona del dolor, tiempo y orden médica." },
      { title: "Caja diaria", body: "Registra pagos por sesión y cierra el día." },
    ],
    chat: [
      { who: "in", text: "Necesito terapia para la rodilla, el médico me mandó 10 sesiones" },
      { who: "out", text: "Claro 🙌 Te agendo martes y jueves a las 6:00 p. m. con Luis, empezando el martes. ¿Te sirve?" },
      { who: "in", text: "Perfecto" },
      { who: "out", text: "¡Listo! Tus 10 sesiones quedaron agendadas. Te recuerdo cada una el día antes." },
    ],
    stat: { value: "10 en 1", label: "una serie completa agendada en segundos" },
  },
  {
    slug: "barberia",
    vertical: "Barbería y peluquería",
    name: "Barberías y peluquerías",
    emoji: "💈",
    headline: "Tus clientes reservan con su barbero favorito, sin llamar.",
    sub: "Velora conoce a cada barbero y sus horarios. El cliente escribe “con Juan el sábado” y queda agendado, con recordatorio incluido.",
    pains: [
      { title: "Sillas vacías entre semana", body: "Y filas los sábados." },
      { title: "Cortes que no vuelven", body: "Nadie le recuerda al cliente que ya le toca el corte." },
      { title: "Mensajes mientras cortas", body: "No puedes soltar la máquina para contestar el WhatsApp." },
    ],
    features: [
      { title: "Agenda por barbero", body: "Cada uno con su color, servicios y días libres." },
      { title: "Lo piden por nombre", body: "“Con Juan” y queda con Juan." },
      { title: "Te toca el corte", body: "Al mes le escribe al cliente para volver." },
      { title: "Campañas", body: "Promos para quienes no vienen hace 3 meses." },
    ],
    chat: [
      { who: "in", text: "Hermano, corte con Juan el sábado en la mañana?" },
      { who: "out", text: "¡De una! 💈 Con Juan el sábado tengo 9:00 y 10:30 a. m. ¿Cuál te guardo?" },
      { who: "in", text: "9" },
      { who: "out", text: "Listo, sábado 9:00 a. m. con Juan ✅" },
    ],
    stat: { value: "24/7", label: "tus clientes reservan aunque estés cortando" },
  },
  {
    slug: "consultorios",
    vertical: "Consultorio médico",
    name: "Consultorios médicos",
    emoji: "🩺",
    headline: "Tu consultorio atiende pacientes, no el teléfono.",
    sub: "Velora agenda consultas y controles, recoge el motivo de consulta y el consentimiento antes de llegar, y confirma un día antes.",
    pains: [
      { title: "Secretaria desbordada", body: "Agenda, cobros, llamadas y pacientes en sala, todo a la vez." },
      { title: "Inasistencias", body: "Consultas perdidas que otro paciente necesitaba." },
      { title: "Información tarde", body: "El motivo de consulta llega cuando el paciente ya está sentado." },
    ],
    features: [
      { title: "Formulario clínico previo", body: "Motivo, alergias, medicamentos y EPS." },
      { title: "Confirmación con botones", body: "Confirmar, mover o cancelar con un toque." },
      { title: "Lista de espera", body: "Si alguien cancela, le ofrece el espacio al siguiente." },
      { title: "Informe mensual", body: "Citas, ingresos e inasistencia del mes." },
    ],
    chat: [
      { who: "in", text: "Buenos días, necesito una cita de medicina general" },
      { who: "out", text: "Buenos días. Hoy tengo 4:00 p. m. o mañana 8:30 a. m. ¿Cuál le queda mejor?" },
      { who: "in", text: "mañana" },
      { who: "out", text: "Agendado ✅ Antes de su cita, por favor complete este breve formulario: (enlace)" },
    ],
    stat: { value: "1 toque", label: "para confirmar, mover o cancelar la cita" },
  },
  {
    slug: "talleres",
    vertical: "Taller",
    name: "Talleres automotrices",
    emoji: "🔧",
    headline: "Tu taller agenda revisiones y cambios de aceite solo.",
    sub: "Velora agenda por WhatsApp, pide placa y modelo antes de llegar y avisa al cliente cuando le toca el próximo mantenimiento.",
    pains: [
      { title: "Bahías ociosas", body: "Días llenos y días vacíos, sin orden." },
      { title: "Datos del carro incompletos", body: "Llegan sin decir qué falla ni qué carro es." },
      { title: "Clientes que se van a otro taller", body: "Nadie les recuerda el siguiente mantenimiento." },
    ],
    features: [
      { title: "Formulario del vehículo", body: "Marca, modelo, placa, kilometraje y falla." },
      { title: "Próximo mantenimiento", body: "A los 6 meses le escribe al cliente." },
      { title: "Agenda por técnico", body: "Cada técnico con sus servicios." },
      { title: "Caja diaria", body: "Efectivo, tarjeta, transferencia y Nequi." },
    ],
    chat: [
      { who: "in", text: "Buenas, cambio de aceite para mañana?" },
      { who: "out", text: "¡Buenas! 🔧 Mañana tengo 8:00 y 11:00 a. m. ¿Cuál te sirve?" },
      { who: "in", text: "8" },
      { who: "out", text: "Listo ✅ Envíame placa y modelo aquí para tener todo listo: (enlace)" },
    ],
    stat: { value: "6 meses", label: "y vuelve solo para su mantenimiento" },
  },
];

export const verticalPage = (slug: string) => VERTICAL_PAGES.find((v) => v.slug === slug);
