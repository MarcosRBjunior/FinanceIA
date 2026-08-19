import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { categoryEnum } from '../db/schema.js';

const CATEGORIES = categoryEnum.enumValues;
const MODEL = 'claude-sonnet-4-5';
const TIMEOUT_MS = 15_000;
const MAX_JSON_RETRIES = 2;
const MAX_RATE_LIMIT_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;

const ClassificationSchema = z.object({
  categoria: z.enum(CATEGORIES),
  confianca: z.number().min(0).max(1),
  justificativa: z.string().min(1),
});

export type ClassificationOutput = z.infer<typeof ClassificationSchema>;

export interface LlmClassificationResult extends ClassificationOutput {
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  modelVersion: string;
}

export type LlmFailureReason = 'invalid_response' | 'timeout' | 'rate_limited';

export class LlmClassificationError extends Error {
  constructor(
    public readonly reason: LlmFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'LlmClassificationError';
  }
}

const SYSTEM_PROMPT = `Você classifica descritores de transações bancárias brasileiras em uma categoria fixa.

Categorias válidas (use exatamente um destes valores): ${CATEGORIES.join(', ')}.

Responda APENAS com um JSON no formato:
{"categoria": "<uma das categorias>", "confianca": <número de 0 a 1>, "justificativa": "<explicação breve>"}

Nenhum texto fora do JSON. Nenhuma categoria fora da lista.

Exemplos:
Descritor: "PAG*IFOOD SP" -> {"categoria": "Alimentação", "confianca": 0.95, "justificativa": "iFood é plataforma de delivery de comida"}
Descritor: "POSTO SHELL BR SP" -> {"categoria": "Transporte", "confianca": 0.9, "justificativa": "Posto de combustível"}
Descritor: "PAG*NETFLIX.COM" -> {"categoria": "Lazer", "confianca": 0.97, "justificativa": "Assinatura de streaming de vídeo"}
Descritor: "TARIFA PACOTE SERVICOS" -> {"categoria": "Taxas e Tarifas", "confianca": 0.98, "justificativa": "Tarifa bancária de manutenção de conta"}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  return err instanceof Anthropic.RateLimitError;
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Anthropic.APIConnectionTimeoutError;
}

function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!block) {
    throw new LlmClassificationError('invalid_response', 'Resposta do modelo não contém bloco de texto');
  }
  return block.text;
}

function parseAndValidate(text: string): ClassificationOutput {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new LlmClassificationError('invalid_response', `JSON malformado: ${text}`);
  }

  const result = ClassificationSchema.safeParse(json);
  if (!result.success) {
    throw new LlmClassificationError(
      'invalid_response',
      `Resposta fora do schema esperado: ${result.error.message}`,
    );
  }

  return result.data;
}

async function callWithBackoff(
  client: Anthropic,
  description: string,
): Promise<{ message: Anthropic.Message; latencyMs: number }> {
  let delay = BASE_BACKOFF_MS;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const start = Date.now();
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Descritor: "${description}"` }],
      });
      return { message, latencyMs: Date.now() - start };
    } catch (err) {
      if (isTimeoutError(err)) {
        throw new LlmClassificationError('timeout', 'Timeout ao chamar a API do Claude');
      }
      if (isRateLimitError(err) && attempt < MAX_RATE_LIMIT_RETRIES) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      if (isRateLimitError(err)) {
        throw new LlmClassificationError('rate_limited', 'Rate limit persistente (HTTP 429)');
      }
      throw err;
    }
  }

  throw new LlmClassificationError('rate_limited', 'Rate limit persistente (HTTP 429)');
}

let defaultClient: Anthropic | null = null;

function getDefaultClient(): Anthropic {
  defaultClient ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: TIMEOUT_MS,
  });
  return defaultClient;
}

export async function classifyWithLlm(
  description: string,
  client: Anthropic = getDefaultClient(),
): Promise<LlmClassificationResult> {
  let lastError: LlmClassificationError | undefined;

  for (let attempt = 0; attempt <= MAX_JSON_RETRIES; attempt++) {
    const { message, latencyMs } = await callWithBackoff(client, description);

    try {
      const text = extractText(message);
      const parsed = parseAndValidate(text);
      return {
        ...parsed,
        latencyMs,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        modelVersion: message.model,
      };
    } catch (err) {
      if (err instanceof LlmClassificationError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new LlmClassificationError('invalid_response', 'Falha desconhecida na classificação');
}
