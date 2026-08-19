import { describe, expect, it } from 'vitest';
import { applyRules } from './rules.js';

describe('applyRules', () => {
  it('classifica PIX enviado/recebido como Transferências', () => {
    expect(applyRules('PIX ENVIADO JOAO S')).toBe('Transferências');
    expect(applyRules('PIX RECEBIDO MARIA F')).toBe('Transferências');
  });

  it('classifica TED como Transferências', () => {
    expect(applyRules('TED ENVIADA BANCO XP')).toBe('Transferências');
  });

  it('classifica TARIFA e IOF como Taxas e Tarifas', () => {
    expect(applyRules('TARIFA PACOTE SERVICOS')).toBe('Taxas e Tarifas');
    expect(applyRules('IOF COMPRA INTERNACIONAL')).toBe('Taxas e Tarifas');
    expect(applyRules('JUROS ROTATIVO CARTAO')).toBe('Taxas e Tarifas');
  });

  it('classifica SALARIO como Renda', () => {
    expect(applyRules('SALARIO EMPRESA XYZ LTDA')).toBe('Renda');
  });

  it('classifica corrida de Uber como Transporte', () => {
    expect(applyRules('MP *UBER TRIP')).toBe('Transporte');
    expect(applyRules('UBER * TRIP HELP.UBER.CO')).toBe('Transporte');
  });

  it('classifica postos e transporte público como Transporte', () => {
    expect(applyRules('POSTO IPIRANGA 123 SP')).toBe('Transporte');
    expect(applyRules('BILHETE UNICO SPTRANS')).toBe('Transporte');
  });

  it('distingue Uber Trip (Transporte) de Uber Eats (Alimentação)', () => {
    expect(applyRules('MP *UBER EATS')).toBe('Alimentação');
    expect(applyRules('MP *UBER TRIP')).toBe('Transporte');
  });

  it('classifica iFood e lanchonetes como Alimentação', () => {
    expect(applyRules('PAG*IFOOD SP')).toBe('Alimentação');
    expect(applyRules('PADARIA CENTRAL LTDA')).toBe('Alimentação');
  });

  it('classifica supermercados como Mercado', () => {
    expect(applyRules('CARREFOUR SUPERMERCADO SP')).toBe('Mercado');
  });

  it('classifica contas de moradia como Moradia', () => {
    expect(applyRules('CONDOMINIO ED SOLAR')).toBe('Moradia');
    expect(applyRules('SABESP AGUA ESGOTO')).toBe('Moradia');
  });

  it('classifica farmácia e planos de saúde como Saúde', () => {
    expect(applyRules('DROGASIL 3345 SP')).toBe('Saúde');
    expect(applyRules('UNIMED PLANO SAUDE')).toBe('Saúde');
  });

  it('classifica cursos e faculdade como Educação', () => {
    expect(applyRules('PAG*UDEMY CURSOS')).toBe('Educação');
  });

  it('classifica streaming como Lazer', () => {
    expect(applyRules('PAG*NETFLIX.COM')).toBe('Lazer');
  });

  it('classifica lojas de roupa como Vestuário', () => {
    expect(applyRules('RENNER LOJAS SP')).toBe('Vestuário');
  });

  it('distingue 99APP assinatura (Serviços) de 99TAXI (Transporte)', () => {
    expect(applyRules('PAG*99APP ASSINATURA')).toBe('Serviços');
    expect(applyRules('99APP* 99TAXI SP')).toBe('Transporte');
  });

  it('não classifica descritores ambíguos — deixa passar para o LLM', () => {
    expect(applyRules('COMPRA DEBITO ESTAB 4512')).toBeNull();
    expect(applyRules('TRANSACAO NAO IDENTIFICADA')).toBeNull();
    expect(applyRules('PAGAMENTO DIVERSOS')).toBeNull();
  });
});
