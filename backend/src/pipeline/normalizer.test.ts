import { describe, expect, it } from 'vitest';
import { normalizeDescriptor } from './normalizer.js';

describe('normalizeDescriptor', () => {
  it('remove o prefixo PAG*', () => {
    expect(normalizeDescriptor('PAG*IFOOD SP')).toBe('IFOOD');
  });

  it('remove o prefixo MP *', () => {
    expect(normalizeDescriptor('MP *UBER TRIP')).toBe('UBER TRIP');
  });

  it('remove dígitos de identificação da transação', () => {
    expect(normalizeDescriptor('PAG*MCDONALDS 0234 SP')).toBe('MCDONALDS');
  });

  it('remove sufixo de cidade/UF', () => {
    expect(normalizeDescriptor('SUPERM BOM PRECO 8962 CURITIBA PR')).toBe('SUPERM BOM PRECO');
  });

  it('mantém o texto já normalizado', () => {
    expect(normalizeDescriptor('TARIFA PACOTE SERVICOS')).toBe('TARIFA PACOTE SERVICOS');
  });

  it('coloca em uppercase', () => {
    expect(normalizeDescriptor('pix enviado joao s')).toBe('PIX ENVIADO JOAO S');
  });
});
