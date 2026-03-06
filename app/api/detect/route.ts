/**
 * app/api/detect/route.ts
 *
 * POST /api/detect — Receives a base64-encoded image from the client, sends it
 * to the Google Gemini API for math problem detection, and returns the raw
 * text response (a JSON array of problems). The API key is kept server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  // Reject requests with body larger than 15MB (base64 of a ~10MB image)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  try {
    const { imageBase64, mediaType } = await req.json();

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { error: "Missing imageBase64 or mediaType" },
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
        { error: "Invalid file type." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
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

    const prompt = `You are a precise text extractor for math and science textbook pages.

Your job: extract every question or problem from the image exactly as written.

Return ONLY a valid JSON array. No explanation, no markdown, no code fences.

Each item must follow this exact structure:
{
  "id": "prob_1",
  "label": "the question number or label exactly as shown e.g. Q2.1, 1., (a)",
  "text": "the full question text, transcribed accurately. Keep all variables, units, numbers, and phrasing intact. If a sentence refers to a figure (e.g. Fig. Q2.2), include that reference in the text exactly as written.",
  "figures": ["Fig. Q2.2"]
}

Rules:
- Transcribe the question text as accurately as possible
- Preserve all mathematical notation, variable names (vx, ax, t1, t2), units, and numbers exactly
- Include every question visible on the page
- Only list figure references that appear explicitly in the question text
- If no problems found, return []`;

    const cleanData = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mediaType,
          data: cleanData,
        },
      },
      { text: prompt },
    ]);

    const text = result.response.text();
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("Gemini API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("RECITATION")) {
      try {
        const { imageBase64: retryBase64, mediaType: retryMediaType } =
          await req.clone().json();
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash-lite",
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });
        const retryPrompt = `List each question from this image as a JSON array: [{"id":"prob_1","label":"Q1","text":"question text","figures":[]}]. Return only the JSON array.`;
        const retryResult = await model.generateContent([
          {
            inlineData: {
              mimeType: retryMediaType,
              data: String(retryBase64).replace(/^data:[^;]+;base64,/, ""),
            },
          },
          { text: retryPrompt },
        ]);
        const retryText = retryResult.response.text();
        return NextResponse.json({ text: retryText });
      } catch {
        return NextResponse.json(
          {
            error:
              "Gemini blocked this image. Try cropping out the page header/title and re-uploading.",
          },
          { status: 422 }
        );
      }
    }

    console.error("Detection error:", err);
    return NextResponse.json(
      { error: "Detection failed. Please try again." },
      { status: 500 }
    );
  }
}
