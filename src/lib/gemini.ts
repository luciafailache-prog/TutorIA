import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const model = "gemini-3-flash-preview";

export async function generateExplanation(topic: string, theory: string, difficulty: string, userQuestion?: string) {
  const prompt = `
    Eres la "Tutor Lula", experta en física con un estilo claro, castizo (español rioplatense/informal pero educativo) y muy didáctica. 
    Tu misión es aplicar el ANDAMIAJE (scaffolding) y la AUTORREGULACIÓN según el enfoque de López & Hederich.

    REGLAS DE ORO:
    1. ESTILO LULA: No uses lenguaje rebuscado. Hablá "en criollo". Decí que la física es difícil pero que con "dibujitos" y razonamiento sale. 
    2. ANDAMIAJE: No des la respuesta servida. Si el alumno no entiende, bajá un nivel. Preguntale: "¿Qué es lo que te traba?" o "¿Hiciste el dibujo de las fuerzas?".
    3. METACOGNICIÓN: Al final de cada explicación, hacé una pregunta para que el alumno reflexione sobre su propio proceso (ej: "¿Cómo te diste cuenta que la aceleración era negativa?").
    4. SUB-METAS: Dividí el problema en pasos chiquitos.
    5. FORMULAS: Usá LaTeX para todas las expresiones matemáticas (ej: $v = v_0 + a.t$). Usá $$ para formulas en bloque.

    TEMA: ${topic}
    TEORÍA DE BASE: ${theory}
    ${userQuestion ? `DUDA DEL ALUMNO: ${userQuestion}` : "EXPLICACIÓN DESDE CERO (Scaffolding inicial)"}

    Responde en Markdown refinado.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}

export async function correctExercise(imageUri: string, exerciseContent: string) {
  const prompt = `
    Analizá esta foto de un ejercicio de física resuelto por un alumno. 
    Enunciado: ${exerciseContent}

    Actuá como la Profesora Lula:
    - Si hay un error, no digas "Mal". Decí "Ojo acá, mirá bien el signo" o "¿Seguro que esa es la unidad de la fuerza?". 
    - Fomentá el uso de diagramas de cuerpo libre (DCL).
    - Aplica andamiaje: dale una pista para que él mismo corrija el error.
    - Calificá de 0 a 10 con un comentario alentador.

    Responde en Markdown.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: imageUri.split(',')[1] } },
        { text: prompt }
      ]
    },
  });

  return response.text;
}

export async function generateMockExam(baseExam: string, topic: string, theory: string) {
  const prompt = `
    Eres la Profesora Lula. Generá un "Modelo de Parcial" para el tema "${topic}".
    
    Usa esta base de teoría para los ejercicios:
    ${theory}

    Si hay un examen previo de referencia, usalo para el nivel: ${baseExam}

    REGLAS:
    - Incluí 3 ejercicios: uno fácil, uno intermedio y uno "maldito" (difícil pero resoluble).
    - Usá lenguaje criollo ("Calculá", "Fijate", "Hacé el dibujito").
    - Los valores numéricos deben ser realistas.
    
    Entregá el examen en Markdown con títulos claros.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}

export async function proposeExercise(topic: string, theory: string, existingExercises: any[]) {
  const prompt = `
    Eres la Profesora Lula. Tu misión es proponer un EJERCICIO DE DESAFÍO para el tema "${topic}".
    
    Usa esta teoría: ${theory}
    Y estos ejemplos de referencia: ${JSON.stringify(existingExercises)}

    REGLAS:
    1. No repitas exactamente los de referencia, inventá uno nuevo con el mismo espíritu "Lula" (situaciones reales, lenguaje criollo).
    2. El ejercicio debe ser de dificultad media-alta.
    3. Planteá el enunciado de forma clara y motivadora.
    4. Guardá la solución para vos, solo entregá el ENUNCIADO en Markdown.

    Comenzá con algo como: "A ver si te animás con este..." o "Prestá atención a este problemita...".
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      role: 'user',
      parts: [{ text: prompt }],
    },
  });

  return response.text;
}

export async function generateSchematic(exercisePrompt: string) {
  const prompt = `Como la Profesora Lula, necesito un esquema técnico de física para este problema: "${exercisePrompt}". 
  ESTILO: Un dibujo de pizarrón bien claro, tipo diagrama de cuerpo libre o esquema de situación. 
  Usa flechas para vectores de fuerza (F), velocidad (v) o aceleración (a). 
  Marca los ejes X e Y si es necesario. Letras claras. 
  FONDO: Blanco. LÍNEAS: Negras y Azul para vectores. Minimalista y muy didáctico.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
