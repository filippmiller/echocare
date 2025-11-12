import OpenAI from "openai";
import { getSupabaseAdmin } from "./supabaseServer";
import { getActiveApiKey, markApiKeyUsed } from "./apiKeys";

const JOURNAL_AUDIO_BUCKET = process.env.SUPABASE_BUCKET ?? "journal-audio";

/**
 * Get OpenAI client with API key from database or environment variable
 */
async function getOpenAIClient(): Promise<{ client: OpenAI; keyId: string | null }> {
  // Try to get key from database first
  const dbKeyResult = await getActiveApiKey("openai");
  
  if (dbKeyResult) {
    return {
      client: new OpenAI({ apiKey: dbKeyResult.key }),
      keyId: dbKeyResult.keyId,
    };
  }

  // Fallback to environment variable
  const envKey = process.env.OPENAI_API_KEY;
  if (!envKey) {
    throw new Error("OpenAI API key not found. Please set OPENAI_API_KEY environment variable or add a key via Admin → API Keys.");
  }

  return {
    client: new OpenAI({ apiKey: envKey }),
    keyId: null,
  };
}

export interface TranscribeOptions {
  path: string;
  lang?: string; // "ru", "en", null = auto
  prompt?: string; // Подсказка для модели
}

export interface TranscribeResult {
  text: string;
  json?: any; // Расширенный результат с временными метками
}

/**
 * Transcribe audio file from Supabase Storage using OpenAI Whisper API
 */
export async function transcribeSupabaseAudio({
  path,
  lang = "ru",
  prompt = "",
}: TranscribeOptions): Promise<TranscribeResult> {
  const supabaseAdmin = getSupabaseAdmin();

  // 1) Получаем подписанный URL на файл в приватном бакете
  const { data, error } = await supabaseAdmin.storage
    .from(JOURNAL_AUDIO_BUCKET)
    .createSignedUrl(path, 60 * 30); // 30 минут

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "Unknown error"}`);
  }

  // 2) Качаем байты и создаём File (Node 18+ поддерживает Web File)
  const res = await fetch(data.signedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio: ${res.statusText}`);
  }

  const blob = await res.blob();
  const file = new File(
    [await blob.arrayBuffer()],
    path.split("/").pop() || "note.webm",
    {
      type: blob.type || "audio/webm",
    }
  );

  // 3) Отправляем в OpenAI STT
  const { client: openai, keyId } = await getOpenAIClient();
  const transcription = await openai.audio.transcriptions.create({
    model: process.env.WHISPER_MODEL ?? "gpt-4o-mini-transcribe", // или "gpt-4o-transcribe"
    file,
    language: lang || undefined, // null = auto-detect
    prompt: prompt || undefined, // Подсказка для улучшения качества
    response_format: "verbose_json", // Для получения временных меток
  });

  // Track API key usage
  if (keyId) {
    await markApiKeyUsed(keyId).catch((err) => {
      console.error("[Transcription] Failed to mark API key as used:", err);
    });
  }

  return {
    text: transcription.text,
    json: transcription, // Расширенный результат с временными метками
  };
}

/**
 * Generate summary and tags from transcription text using GPT-4o-mini
 */
export async function generateSummaryAndTags(
  transcriptionText: string,
  lang: string = "ru"
): Promise<{ summary: string; tags: string[] }> {
  const systemPrompt = lang === "ru"
    ? "Ты помощник для создания краткого резюме и тегов из транскрипции голосовой заметки. Верни JSON: {summary: 'краткое резюме 1-2 предложения', tags: ['тег1', 'тег2', 'тег3', 'тег4', 'тег5']}. Максимум 5 тегов."
    : "You are a helper for creating a brief summary and tags from a voice note transcription. Return JSON: {summary: 'brief summary 1-2 sentences', tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']}. Maximum 5 tags.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcriptionText },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
  
  // Track API key usage
  if (keyId) {
    await markApiKeyUsed(keyId).catch((err) => {
      console.error("[Transcription] Failed to mark API key as used:", err);
    });
  }
  
  return {
    summary: result.summary || "",
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
  };
}

