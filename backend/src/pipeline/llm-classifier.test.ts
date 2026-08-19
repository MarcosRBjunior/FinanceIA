import Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { classifyWithLlm, LlmClassificationError } from './llm-classifier.js';

function fakeMessage(text: string): Anthropic.Message {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-5',
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 40 } as Anthropic.Usage,
  } as Anthropic.Message;
}

function fakeClient(create: (...args: unknown[]) => unknown): Anthropic {
  return { messages: { create } } as unknown as Anthropic;
}

describe('classifyWithLlm', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('classifica com sucesso e retorna categoria, confiança e telemetria', async () => {
    const create = vi
      .fn()
      .mockResolvedValue(
        fakeMessage('{"categoria": "Alimentação", "confianca": 0.95, "justificativa": "iFood é delivery"}'),
      );
    const result = await classifyWithLlm('PAG*IFOOD SP', fakeClient(create));

    expect(result.categoria).toBe('Alimentação');
    expect(result.confianca).toBe(0.95);
    expect(result.inputTokens).toBe(120);
    expect(result.outputTokens).toBe(40);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('faz retry em JSON malformado e sucede na segunda tentativa', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(fakeMessage('isso não é json'))
      .mockResolvedValueOnce(
        fakeMessage('{"categoria": "Transporte", "confianca": 0.9, "justificativa": "posto de gasolina"}'),
      );

    const result = await classifyWithLlm('POSTO SHELL', fakeClient(create));

    expect(result.categoria).toBe('Transporte');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('esgota os retries e lança LlmClassificationError quando o JSON nunca é válido', async () => {
    const create = vi.fn().mockResolvedValue(fakeMessage('não é json'));

    await expect(classifyWithLlm('DESCRITOR X', fakeClient(create))).rejects.toMatchObject({
      reason: 'invalid_response',
    });
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('rejeita categoria fora do enum e trata como resposta inválida', async () => {
    const create = vi
      .fn()
      .mockResolvedValue(
        fakeMessage('{"categoria": "Categoria Inventada", "confianca": 0.8, "justificativa": "x"}'),
      );

    await expect(classifyWithLlm('DESCRITOR Y', fakeClient(create))).rejects.toBeInstanceOf(
      LlmClassificationError,
    );
    await expect(classifyWithLlm('DESCRITOR Y', fakeClient(create))).rejects.toMatchObject({
      reason: 'invalid_response',
    });
  });

  it('aplica backoff exponencial em 429 e sucede após os retries', async () => {
    vi.useFakeTimers();
    const rateLimitError = new Anthropic.RateLimitError(
      429,
      { error: { message: 'rate limited' } },
      'rate limited',
      undefined,
    );
    const create = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(
        fakeMessage('{"categoria": "Lazer", "confianca": 0.9, "justificativa": "streaming"}'),
      );

    const promise = classifyWithLlm('NETFLIX', fakeClient(create));
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.categoria).toBe('Lazer');
    expect(create).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('lança LlmClassificationError com reason timeout em APIConnectionTimeoutError', async () => {
    const create = vi.fn().mockRejectedValue(new Anthropic.APIConnectionTimeoutError());

    await expect(classifyWithLlm('DESCRITOR Z', fakeClient(create))).rejects.toMatchObject({
      reason: 'timeout',
    });
  });
});
