/**
 * app/api/detect/route.ts
 *
 * POST /api/detect — Receives a base64-encoded image from the client, sends it
 * to the Google Gemini API for math problem detection, and returns the raw
 * text response (a JSON array of problems). The API key is kept server-side.
 * Body is parsed once at the top so RECITATION retry can use the same payload.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  let imageBase64 = "";
  let mediaType = "";

  try {
    const body = await req.json();
    imageBase64 = body.imageBase64 ?? "";
    mediaType = body.mediaType ?? "";
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!imageBase64 || !mediaType) {
    return NextResponse.json(
      { error: "Missing imageBase64 or mediaType." },
      { status: 400 }
    );
  }
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    return NextResponse.json(
      { error: "Invalid image data." },
      { status: 400 }
    );
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPG, PNG, or WEBP." },
      { status: 400 }
    );
  }

  let cleanBase64 = imageBase64;
  if (imageBase64.includes(",")) {
    cleanBase64 = imageBase64.split(",")[1];
  }

  if (!cleanBase64 || cleanBase64.length < 100) {
    return NextResponse.json(
      { error: "Image data is empty or too short." },
      { status: 400 }
    );
  }

  console.log(
    "[API/detect] mediaType:",
    mediaType,
    "| base64 length:",
    cleanBase64.length
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const buildModel = () =>
    genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

  const callGemini = async (
    prompt: string,
    b64: string,
    mime: string
  ): Promise<string> => {
    const model = buildModel();
    const result = await model.generateContent([
      { inlineData: { mimeType: mime, data: b64 } },
      { text: prompt },
    ]);
    return result.response.text();
  };

  const mainPrompt = `You are a precise text extractor for math and science textbook pages.

Extract every question or problem from the image exactly as written.

Return ONLY a valid JSON array. No explanation, no markdown, no code fences.

Each item must follow this exact structure:
{
  "id": "prob_1",
  "label": "question number exactly as shown e.g. 2.51, Q2.1, (a)",
  "text": "full question text transcribed accurately",
  "figures": ["Fig. P2.62"]
}

CRITICAL NOTATION RULES — follow exactly:
- Subscripts: write as plain letters ONCE. ax(t) NOT axx(t), vx NOT vxx
- Superscripts/powers: use ^ symbol. t^2 NOT t² NOT t squared
- Greek letters: write the NAME in plain English. beta NOT β, alpha NOT α, omega NOT ω, theta NOT θ, pi NOT π, mu NOT μ, Delta NOT Δ
- Units: keep exactly as written. m/s^3, m/s^2, kg, N
- Multiplication: write adjacent or use *. 2t or 2*t NOT 2×t
- Do NOT use Unicode symbols, subscript Unicode chars, or special math characters
- Do NOT add any characters not present in the original
- Copy question text EXACTLY as it appears in the image
- Include every question visible on the page
- Only list figure references explicitly mentioned in the question text
- If no problems found, return []`;

  const retryPrompt = `List each question from this image as a JSON array:
[{"id":"prob_1","label":"Q1","text":"question text","figures":[]}]
Return only the JSON array, nothing else.`;

  try {
    const text = await callGemini(mainPrompt, cleanBase64, mediaType);
    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API/detect] Gemini error:", message);

    if (message.includes("RECITATION")) {
      console.log("[API/detect] RECITATION — retrying with short prompt");
      try {
        const retryText = await callGemini(
          retryPrompt,
          cleanBase64,
          mediaType
        );
        return NextResponse.json({ text: retryText });
      } catch (retryErr: unknown) {
        const retryMsg =
          retryErr instanceof Error ? retryErr.message : "Unknown";
        console.error("[API/detect] Retry failed:", retryMsg);
        return NextResponse.json(
          {
            error:
              "Gemini blocked this image. Try cropping out the page header and re-uploading.",
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: "Detection failed. Please try again." },
      { status: 500 }
    );
  }
}
