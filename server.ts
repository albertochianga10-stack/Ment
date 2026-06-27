import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize the Google Gen AI client with a default telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set correctly.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const ai = getGeminiClient();

// Helper to check if error is due to high demand (503 / UNAVAILABLE / 429 / RESOURCE_EXHAUSTED)
function isHighDemandOrUnavailable(error: any): boolean {
  if (!error) return false;
  const errMsg = typeof error === 'string' ? error : (error.message || "");
  const errStringified = JSON.stringify(error);
  
  const matches = [
    "503",
    "429",
    "unavailable",
    "high demand",
    "busy",
    "temporary",
    "try again later",
    "quota",
    "exhausted",
    "resource_exhausted"
  ];
  
  return matches.some(term => 
    errMsg.toLowerCase().includes(term) || 
    errStringified.toLowerCase().includes(term) ||
    error.status === "UNAVAILABLE" ||
    error.status === "RESOURCE_EXHAUSTED" ||
    error.status === 503 ||
    error.status === 429 ||
    error.code === 503 ||
    error.code === 429 ||
    error.statusCode === 503 ||
    error.statusCode === 429
  );
}

// Helper to execute generateContent with automatic retry and model fallback in case of high demand (503) or rate limit (429)
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
  fallbackModel?: string;
}) {
  const { contents, config = {}, primaryModel = "gemini-3.5-flash", fallbackModel = "gemini-3.1-flash-lite" } = params;
  
  // List of all model candidates in order of preference
  const models = [
    primaryModel,
    fallbackModel,
    "gemini-flash-latest",
  ];
  
  // Remove duplicates while preserving order
  const uniqueModels = Array.from(new Set(models));
  
  let lastError: any = null;

  for (const currentModel of uniqueModels) {
    console.log(`Attempting generation with model: ${currentModel}`);
    const maxAttemptsForThisModel = 2;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxAttemptsForThisModel; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config,
        });
        console.log(`Generation succeeded with model: ${currentModel}`);
        return response;
      } catch (error: any) {
        lastError = error;
        const isUnavailable = isHighDemandOrUnavailable(error);
        console.warn(`Model ${currentModel} (Attempt ${attempt}/${maxAttemptsForThisModel}) failed. isUnavailable: ${isUnavailable}. Error: ${error?.message || error}`);
        
        // If the model is completely unavailable/busy, do not waste time retrying it.
        // Immediately break and fall back to the next candidate model!
        if (isUnavailable) {
          console.warn(`Model ${currentModel} is busy or unavailable. Skipping further attempts and trying next model...`);
          break;
        }

        // For other temporary errors (e.g. rate limit), wait and retry.
        if (attempt < maxAttemptsForThisModel) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content from Gemini across all candidate models.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, mode, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Build System Prompt
      const systemInstruction = `Você é um professor, mentor estratégico e consultor especializado em diversas áreas do conhecimento. 
Responda SEMPRE em português do utilizador (pt-PT ou pt-BR conforme contexto), de forma clara, profunda, organizada e prática. 
Use formatação rica com títulos (##), subtítulos (###), listas numeradas, bullet points, destaques em **negrito**, separadores (---) e emojis temáticos para facilitar a leitura. 
Baseie-se em boas práticas reconhecidas e, quando apropriado, apresente diferentes perspectivas destacando vantagens, limitações e incertezas.`;

      // Build User prompt based on active mode
      let userPrompt = "";
      if (mode === "aprendizagem") {
        userPrompt = `Modo ativado: APRENDIZAGEM

Solicitação: ${message}

Estruture a resposta com:
1. Introdução e definição
2. História e origem
3. Conceitos fundamentais
4. Funcionamento e princípios
5. Aplicações práticas e exemplos reais
6. Ferramentas e estratégias
7. Boas práticas e erros comuns
8. Exercícios e desafios
9. FAQ
10. Glossário dos termos principais
11. Plano de estudo sugerido
12. RESUMO PREMIUM (conceitos-chave, plano de ação, passos seguintes, perguntas de revisão)`;
      } else if (mode === "estrategico") {
        userPrompt = `Modo ativado: ESTRATÉGICO

Solicitação: ${message}

Inclua obrigatoriamente:
- Análise SWOT (Forças, Fraquezas, Oportunidades, Ameaças)
- Oportunidades e riscos
- Plano estratégico, financeiro, operacional e de marketing
- Cronograma e KPIs (Indicadores-chave de desempenho)
- Recomendações finais`;
      } else {
        // Mentor mode
        userPrompt = `Modo ativado: MENTOR

Solicitação: ${message}

Ajude-me com conselhos práticos, orientação profissional, mentoria passo a passo e direcionamento de carreira ou de negócios focado nos meus objetivos.`;
      }

      // Convert conversation history to Gemini expected format if provided
      // history is expected to be an array of { role: 'user' | 'model', parts: [{ text: '...' }] }
      const formattedHistory = (history || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      // Append latest message
      const contents = [
        ...formattedHistory,
        { role: "user", parts: [{ text: userPrompt }] }
      ];

      const response = await generateContentWithRetry({
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      res.json({ text });
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: error?.message || "Failed to communicate with AI" });
    }
  });

  // API Route: Generate Flashcards from educational text
  app.post("/api/generate-flashcards", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Context text is required" });
      }

      const prompt = `Com base no seguinte texto, gere um conjunto de até 6 flashcards didáticos e objetivos para memorização. Cada flashcard deve focar em um conceito importante. Retorne os dados estritamente em formato JSON seguindo a estrutura fornecida.

Texto:
${text.slice(0, 4000)}`;

      const response = await generateContentWithRetry({
        contents: prompt,
        config: {
          systemInstruction: "Você é um gerador especializado em flashcards didáticos e de alta retenção de conteúdo.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: {
                  type: Type.STRING,
                  description: "A pergunta direta ou conceito a ser adivinhado no lado da frente do flashcard.",
                },
                back: {
                  type: Type.STRING,
                  description: "A resposta concisa e explicativa para o lado de trás do flashcard.",
                },
              },
              required: ["front", "back"],
            },
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response generated for flashcards");
      }

      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Error generating flashcards:", error);
      res.status(500).json({ error: error?.message || "Failed to generate flashcards" });
    }
  });

  // API Route: Generate Quiz from educational text
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Context text is required" });
      }

      const prompt = `Com base no seguinte texto explicativo, gere um questionário de múltipla escolha com exatamente 5 perguntas de alta qualidade para testar e reforçar a aprendizagem. Retorne estritamente em formato JSON seguindo o esquema especificado.

Texto:
${text.slice(0, 4000)}`;

      const response = await generateContentWithRetry({
        contents: prompt,
        config: {
          systemInstruction: "Você é um elaborador de exames acadêmicos e testes de inteligência corporativa de altíssimo nível.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: {
                  type: Type.STRING,
                  description: "O enunciado da pergunta de múltipla escolha.",
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exatamente 4 opções de resposta alternativas para o utilizador escolher.",
                },
                correctAnswerIndex: {
                  type: Type.INTEGER,
                  description: "O índice baseado em 0 (0 a 3) indicando qual das opções é a correta.",
                },
                explanation: {
                  type: Type.STRING,
                  description: "Uma explicação clara e didática de por que essa alternativa é a correta e o que as outras representam.",
                },
              },
              required: ["question", "options", "correctAnswerIndex", "explanation"],
            },
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response generated for quiz");
      }

      res.json(JSON.parse(resultText));
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ error: error?.message || "Failed to generate quiz" });
    }
  });

  // Serve Vite app in development vs static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
