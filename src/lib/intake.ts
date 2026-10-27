import type { IntakeField } from "./domain/types";

const f = (id: string, label: string, type: IntakeField["type"], extra: Partial<IntakeField> = {}): IntakeField => ({ id, label, type, ...extra });

/** Ready-made pre-visit forms by type of business. */
export const INTAKE_TEMPLATES: Record<string, IntakeField[]> = {
  Odontología: [
    f("motivo", "¿Cuál es el motivo de tu consulta?", "textarea", { required: true }),
    f("alergias", "¿Tienes alergias a medicamentos o anestesia?", "text"),
    f("medicamentos", "¿Tomas algún medicamento actualmente?", "text"),
    f("embarazo", "¿Estás en embarazo o lactancia?", "select", { options: ["No", "Sí", "No aplica"] }),
    f("consentimiento", "Autorizo el tratamiento de mis datos de salud para esta atención", "checkbox", { required: true }),
  ],
  "Consultorio médico": [
    f("motivo", "Motivo de consulta y síntomas", "textarea", { required: true }),
    f("alergias", "Alergias conocidas", "text"),
    f("medicamentos", "Medicamentos que tomas", "text"),
    f("eps", "EPS o medicina prepagada", "text"),
    f("consentimiento", "Autorizo el tratamiento de mis datos de salud para esta atención", "checkbox", { required: true }),
  ],
  Veterinaria: [
    f("mascota", "Nombre de tu mascota", "text", { required: true }),
    f("especie", "Especie", "select", { options: ["Perro", "Gato", "Ave", "Conejo", "Otro"], required: true }),
    f("raza_edad", "Raza y edad", "text"),
    f("motivo", "¿Qué le pasa o qué necesita?", "textarea"),
    f("vacunas", "¿Tiene las vacunas al día?", "select", { options: ["Sí", "No", "No sé"] }),
  ],
  "Estética y spa": [
    f("piel", "Tipo de piel", "select", { options: ["Normal", "Seca", "Grasa", "Mixta", "Sensible", "No sé"] }),
    f("alergias", "Alergias o reacciones a productos", "text"),
    f("procedimientos", "¿Procedimientos estéticos recientes?", "text"),
    f("consentimiento", "Acepto el consentimiento informado del procedimiento", "checkbox", { required: true }),
  ],
  Fisioterapia: [
    f("zona", "Zona del dolor o lesión", "text", { required: true }),
    f("tiempo", "¿Hace cuánto empezó?", "select", { options: ["Menos de 1 semana", "1 a 4 semanas", "1 a 6 meses", "Más de 6 meses"] }),
    f("orden", "¿Tienes orden médica?", "select", { options: ["Sí", "No"] }),
    f("cirugias", "Cirugías o lesiones previas", "textarea"),
  ],
  "Barbería y peluquería": [
    f("estilo", "¿Qué estilo quieres? (puedes describirlo)", "textarea"),
    f("alergias", "Alergias a tintes o productos", "text"),
  ],
  Taller: [
    f("vehiculo", "Marca, modelo y año del vehículo", "text", { required: true }),
    f("placa", "Placa", "text", { required: true }),
    f("kilometraje", "Kilometraje aproximado", "text"),
    f("problema", "¿Qué falla o servicio necesitas?", "textarea"),
  ],
};

export const intakeTemplateFor = (vertical: string): IntakeField[] => INTAKE_TEMPLATES[vertical] ?? [
  f("motivo", "¿Hay algo que debamos saber antes de tu cita?", "textarea"),
];

/** Pretty "Pregunta: respuesta" pairs for the panel. */
export function intakeAnswers(fields: IntakeField[] | undefined, answers: Record<string, string | boolean> | undefined) {
  if (!answers) return [];
  const known = new Map((fields ?? []).map((x) => [x.id, x.label]));
  return Object.entries(answers)
    .filter(([, v]) => v !== "" && v !== false)
    .map(([k, v]) => ({ label: known.get(k) ?? k, value: v === true ? "Sí" : String(v) }));
}
