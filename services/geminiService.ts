import { GoogleGenAI } from "@google/genai";

export const improveReport = async (rawNotes: string): Promise<string> => {
  try {
    // Initialize GoogleGenAI with the API key directly from process.env.API_KEY as per guidelines.
    // Assume process.env.API_KEY is pre-configured and valid.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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