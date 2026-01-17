
import { GoogleGenAI } from "@google/genai";

export const improveReport = async (rawNotes: string): Promise<string> => {
  try {
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
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || rawNotes;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return rawNotes;
  }
};

export const generateRouteBriefing = async (routeName: string, history: { date: string, notes: string }[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const historyText = history.map(h => `[${h.date}]: ${h.notes}`).join('\n');
    
    const prompt = `
      Com base no histórico de visitas abaixo para a rota "${routeName}", crie um briefing curto (máximo 300 caracteres) para os próximos visitantes.
      Destaque pontos de atenção, pacientes que precisam de carinho extra ou dificuldades encontradas recentemente.
      Seja encorajador e objetivo.
      
      Histórico:
      ${historyText}
      
      Briefing (responda apenas o texto):
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Sem observações críticas para esta rota.";
  } catch (error) {
    console.error("Error generating briefing:", error);
    return "Não foi possível carregar o briefing inteligente.";
  }
};
