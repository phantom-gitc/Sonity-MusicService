import { GoogleGenAI } from "@google/genai";
import config from "../config/config.js";

/**
 * Analyzes a user prompt using Gemini 3.6 Flash and extracts query parameters
 * to match songs in the database for AI playlist generation.
 */
export const analyzePlaylistPrompt = async (prompt, availableCatalog = []) => {
  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const catalogSummary = availableCatalog.map(song => ({
    id: song._id.toString(),
    title: song.title,
    artist: song.artist,
    genre: song.genre,
    mood: song.mood || "",
    tags: song.tags || []
  }));

  const systemInstruction = `You are an expert AI music curator and playlist creator.
Your task is to analyze the user's prompt (mood, activity, genre, theme) and select the most relevant songs from the provided catalog, or return key search terms if the catalog is empty.

Available Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Return ONLY a raw valid JSON object with the following schema (no markdown, no backticks, no text before or after):
{
  "title": "A creative title for this playlist",
  "description": "A short, engaging 1-2 sentence description explaining the vibe",
  "matchedSongIds": ["string array of matching song IDs from catalog"],
  "searchKeywords": ["string array of 3-5 fallback search keywords if matched song count is low"],
  "recommendedGenres": ["string array of genres implied by prompt"]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.7,
      responseMimeType: "application/json"
    }
  });

  const responseText = response.text?.trim() || "";
  
  try {
    return JSON.parse(responseText);
  } catch (err) {
    console.error("Failed to parse Gemini JSON output:", responseText);
    throw new Error("Invalid response received from AI model.");
  }
};
