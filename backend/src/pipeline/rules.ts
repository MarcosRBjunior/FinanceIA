import type { categoryEnum } from '../db/schema.js';
import { normalizeDescriptor } from './normalizer.js';

type Category = (typeof categoryEnum.enumValues)[number];

interface Rule {
  category: Category;
  pattern: RegExp;
}

const RULES: Rule[] = [
  { category: 'Transferências', pattern: /\bPIX (ENVIADO|RECEBIDO)\b/ },
  { category: 'Transferências', pattern: /\bTED (ENVIADA|RECEBIDA)\b/ },
  { category: 'Taxas e Tarifas', pattern: /\bTARIFA\b/ },
  { category: 'Taxas e Tarifas', pattern: /\bIOF\b/ },
  { category: 'Taxas e Tarifas', pattern: /\bJUROS\b/ },
  { category: 'Renda', pattern: /\bSALARIO\b/ },
  {
    category: 'Transporte',
    pattern: /(UBER\s*\*?\s*TRIP|\b99TAXI\b|\bPOSTO IPIRANGA\b|\bPOSTO SHELL\b|\bESTAC\b|\bBILHETE UNICO\b|\bSPTRANS\b)/,
  },
  {
    category: 'Alimentação',
    pattern: /\b(IFOOD|UBER EATS|MCDONALDS|BURGER KING|STARBUCKS|HABIBS|PADARIA|REST BOM SABOR|LANCHONETE)\b/,
  },
  {
    category: 'Mercado',
    pattern: /\b(CARREFOUR|PAO DE ACUCAR|SUPERMERCADO|SUPERM|ATACADAO)\b/,
  },
  { category: 'Moradia', pattern: /\b(CONDOMINIO|ALUGUEL|ENEL|SABESP|COMGAS)\b/ },
  {
    category: 'Saúde',
    pattern: /\b(DROGARIA|DROGASIL|UNIMED|CLINICA|FARMACIA|LABORATORIO)\b/,
  },
  { category: 'Educação', pattern: /\b(FACULDADE|UDEMY|ALURA|LIVRARIA CULTURA)\b/ },
  { category: 'Lazer', pattern: /\b(NETFLIX|SPOTIFY|CINEMARK|STEAMGAMES|DISNEYPLUS|HBOMAX)\b/ },
  { category: 'Vestuário', pattern: /\b(RENNER|C&A|ZARA|NIKE)\b/ },
  { category: 'Serviços', pattern: /\b(CARTORIO|BARBEARIA|ADOBE|CANVA|99APP ASSINATURA)\b/ },
];

export function applyRules(description: string): Category | null {
  const normalized = normalizeDescriptor(description);

  for (const rule of RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.category;
    }
  }

  return null;
}
