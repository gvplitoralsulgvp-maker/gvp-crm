
import { GoogleGenAI } from "@google/genai";

export const improveReport = async (rawNotes: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Atue como um Secretário GVP (Grupo de Visita a Pacientes) de alto nível.
      Sua tarefa é pegar anotações informais de uma visita hospitalar e transformá-las em um relato profissional, empático e objetivo.
      
      Regras:
      1. Mantenha o tom respeitoso e amoroso.
      2. Corrija gramática e pontuação.
      3. Seja conciso, mas sem perder detalhes importantes sobre o estado emocional ou burocrático (diretivas, S-55).
      4. Mantenha o anonimato de terceiros se não forem relevantes.
      
      Notas originais: "${rawNotes}"
      
      Responda APENAS com o texto melhorado, sem introduções ou explicações.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || rawNotes;
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
      Atue como o Coordenador GVP passando o bastão para uma nova dupla.
      Com base no histórico de visitas abaixo para a rota "${routeName}", crie um briefing estratégico curto (máximo 280 caracteres).
      Destaque:
      - Pacientes que precisam de atenção especial.
      - Pendências de documentos (Cartão de Diretivas, S-55).
      - Clima geral nos hospitais da rota.
      
      Histórico Recente:
      ${historyText}
      
      Briefing (responda apenas o texto do briefing):
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Sem observações críticas para esta rota.";
  } catch (error) {
    console.error("Error generating briefing:", error);
    return "Não foi possível carregar o briefing inteligente.";
  }
};
