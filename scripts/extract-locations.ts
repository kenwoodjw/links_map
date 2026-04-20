/**
 * AI-powered location extractor.
 *
 * Reads:  raw/channel.json  (yt-dlp --flat-playlist dump)
 * Writes: raw/locations-raw.json
 *
 * Requires DEEPSEEK_API_KEY (preferred, reuses user's existing key) or
 * ANTHROPIC_API_KEY in .env.local. Falls back to a skip if neither set.
 *
 * For each video, asks the LLM to return a JSON array of real-world
 * geographic locations mentioned in the title + description. Low-signal
 * videos (e.g. camera reviews) return [].
 *
 * Run:  pnpm tsx scripts/extract-locations.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RawEntry = {
  id: string;
  title: string;
  description?: string;
  thumbnails?: { url: string; width?: number; height?: number }[];
  view_count?: number;
  duration?: number;
};

type ExtractedLocation = {
  name: string; // prefer Chinese if present in source
  nameEn?: string;
  country: string;
  confidence: "high" | "medium" | "low";
};

type VideoLocations = {
  videoId: string;
  title: string;
  thumbnail: string;
  viewCount?: number;
  durationSec?: number;
  locations: ExtractedLocation[];
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANNEL_JSON = path.join(ROOT, "raw/channel.json");
const OUT_JSON = path.join(ROOT, "raw/locations-raw.json");

// Load .env.local
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!DEEPSEEK_KEY && !ANTHROPIC_KEY) {
  console.error(
    "❌ Neither DEEPSEEK_API_KEY nor ANTHROPIC_API_KEY set. Put one in .env.local and retry.\n" +
      "   As a fallback, you can run: pnpm tsx scripts/extract-basic.ts"
  );
  process.exit(1);
}

const USE = DEEPSEEK_KEY ? "deepseek" : "anthropic";
console.log(`🤖 Using ${USE} for extraction`);

const SYSTEM_PROMPT = `你是一个旅游地点提取助手。从 YouTube 视频的标题和描述中提取**真实的地理位置**。

规则：
- 只提取真实存在的城市、国家、景点、山峰、岛屿、湖泊等地理位置
- 忽略泛指词（"亚洲"、"欧洲"）、虚构地点、装备/相机名称
- 同一个地点的多种叫法统一到最常见的中文名（若无中文则用英文）
- 返回**严格的 JSON 数组**，不要任何解释
- 格式：[{"name":"冰岛雷克雅未克","nameEn":"Reykjavik","country":"冰岛","confidence":"high"}]
- confidence: high=标题/描述明确提到; medium=有地点线索但不完全明确; low=模糊猜测
- 若视频不包含任何地点，返回 []`;

async function callDeepseek(userPrompt: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

async function callAnthropic(userPrompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text: string }[] };
  return data.content.find((c) => c.type === "text")?.text ?? "[]";
}

function parseLocations(raw: string): ExtractedLocation[] {
  // DeepSeek with json_object returns {locations: [...]} or similar; Anthropic returns raw array.
  const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return [];
    parsed = JSON.parse(match[0]);
  }
  if (Array.isArray(parsed)) return parsed as ExtractedLocation[];
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const v of Object.values(obj)) if (Array.isArray(v)) return v as ExtractedLocation[];
  }
  return [];
}

async function extractForVideo(entry: RawEntry): Promise<ExtractedLocation[]> {
  const userPrompt = `标题: ${entry.title}\n\n描述: ${(entry.description ?? "").slice(0, 1500)}\n\n请提取地点，返回 {"locations": [...]} 形式的 JSON。`;
  const raw = USE === "deepseek" ? await callDeepseek(userPrompt) : await callAnthropic(userPrompt);
  return parseLocations(raw);
}

function thumbnailOf(entry: RawEntry): string {
  const ts = entry.thumbnails ?? [];
  const best = ts.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return best?.url ?? `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`;
}

async function main() {
  const channel = JSON.parse(fs.readFileSync(CHANNEL_JSON, "utf8")) as { entries: RawEntry[] };
  console.log(`📼 ${channel.entries.length} videos in channel`);

  // Resume support
  const prior: VideoLocations[] = fs.existsSync(OUT_JSON)
    ? JSON.parse(fs.readFileSync(OUT_JSON, "utf8"))
    : [];
  const done = new Set(prior.map((v) => v.videoId));
  const results: VideoLocations[] = [...prior];

  for (let i = 0; i < channel.entries.length; i++) {
    const e = channel.entries[i];
    if (done.has(e.id)) continue;
    try {
      const locs = await extractForVideo(e);
      results.push({
        videoId: e.id,
        title: e.title,
        thumbnail: thumbnailOf(e),
        viewCount: e.view_count,
        durationSec: e.duration,
        locations: locs,
      });
      console.log(`[${i + 1}/${channel.entries.length}] ${e.title.slice(0, 60)} → ${locs.length} loc`);
    } catch (err) {
      console.warn(`⚠️  ${e.id}: ${(err as Error).message}`);
      results.push({
        videoId: e.id,
        title: e.title,
        thumbnail: thumbnailOf(e),
        viewCount: e.view_count,
        durationSec: e.duration,
        locations: [],
      });
    }
    // Checkpoint every 10
    if (i % 10 === 9) fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
    // Gentle pacing
    await new Promise((r) => setTimeout(r, 300));
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  const total = results.reduce((n, v) => n + v.locations.length, 0);
  console.log(`✅ Wrote ${OUT_JSON} — ${results.length} videos, ${total} location mentions`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
