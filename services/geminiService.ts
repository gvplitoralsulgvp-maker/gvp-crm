import { GoogleGenAI } from "@google/genai";

export const improveReport = async (rawNotes: string): Promise<string> => {
  try {
    // Safely retrieve API Key avoiding crash if process is undefined
    let apiKey = '';
    try {
      apiKey = process.env.API_KEY || '';
    } catch (e) {
      console.warn("API Key environment variable not found.");
    }

    if (!apiKey) {
        console.warn("Gemini API Key is missing. Returning raw notes.");
        return rawNotes;
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Atue como um secretário experiente do Grupo de Visitas a Pacientes (GVP).
      Melhore e formate o seguinte relato de visita hospitalar para ser mais claro, objetivo e respeitoso.
      Corrija erros de português.
      Mantenha as informações médicas precisas (se houver).
      
      Texto original: "${rawNotes}"
      
      Responda apenas com o texto melhorado.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || rawNotes;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return rawNotes;
  }
};