import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const upload = multer({ storage: multer.memoryStorage() });

// Helper to initialize Gemini API (throws error if key missing)
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

app.post("/api/parse-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const aiClient = getAI();
    
    // We expect the user to send an image of a table.
    // We want the AI to extract specific columns and return JSON.
    const prompt = `
Extract the following columns from the provided table image: 'Prop', 'Unit', 'Check In', 'Check out', and 'Guest'. 
If the table has other columns, ignore them.
Return a clean JSON array of objects. 
Example format:
[
  { "Prop": "ABC", "Unit": "101", "Check In": "10/24", "Check out": "10/26", "Guest": "John Doe" }
]
Only return the JSON array, no extra text or markdown formatting.
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } else {
      res.status(500).json({ error: "No text returned from Gemini" });
    }
  } catch (error: any) {
    console.error("Error parsing image:", error);
    res.status(500).json({ error: error.message || "Failed to parse image" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
