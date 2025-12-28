
import { GoogleGenAI, Type } from "@google/genai";
import { Step } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateRhythmPattern(description: string): Promise<Step[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a creative 16-step rhythmic arpeggio pattern for a musical sampler. 
              The sound type is: ${description}. 
              Return an array of 16 steps where each step has active (boolean), velocity (0.0 to 1.0), and pitch (semitones, -12 to 12).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            active: { type: Type.BOOLEAN },
            velocity: { type: Type.NUMBER },
            pitch: { type: Type.NUMBER }
          },
          required: ["active", "velocity", "pitch"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return data;
  } catch (e) {
    console.error("Failed to parse pattern", e);
    return Array(16).fill(0).map(() => ({ active: false, velocity: 0.8, pitch: 0 }));
  }
}
