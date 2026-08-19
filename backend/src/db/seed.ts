import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './client.js';
import { transactions } from './schema.js';

type Category =
  | 'Alimentação'
  | 'Mercado'
  | 'Transporte'
  | 'Moradia'
  | 'Saúde'
  | 'Educação'
  | 'Lazer'
  | 'Vestuário'
  | 'Serviços'
  | 'Transferências'
  | 'Renda'
  | 'Taxas e Tarifas'
  | 'Outros';

const CIDADES_UF = ['SP', 'SAO PAULO SP', 'RJ', 'RIO DE JANEIRO RJ', 'BH', 'CURITIBA PR', 'POA RS'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomAmount(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randomDigits(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
}

function suffix(): string {
  const options = ['', ` ${pick(CIDADES_UF)}`, ` ${randomDigits(4)}`, ` ${randomDigits(4)} ${pick(CIDADES_UF)}`];
  return pick(options);
}

interface TemplateGroup {
  category: Category;
  type: 'debit' | 'credit';
  amountRange: [number, number];
  templates: string[];
  weight: number;
}

const GROUPS: TemplateGroup[] = [
  {
    category: 'Alimentação',
    type: 'debit',
    amountRange: [15, 120],
    weight: 20,
    templates: [
      'PAG*IFOOD',
      'MP *UBER EATS',
      'IFD*IFOOD',
      'PAG*MCDONALDS',
      'PAG*BURGER KING',
      'PAG*STARBUCKS',
      'REST BOM SABOR',
      'PADARIA CENTRAL LTDA',
      'PAG*HABIBS',
      'LANCHONETE DO PONTO',
    ],
  },
  {
    category: 'Mercado',
    type: 'debit',
    amountRange: [40, 450],
    weight: 12,
    templates: [
      'CARREFOUR SUPERMERCADO',
      'PAO DE ACUCAR',
      'SUPERMERCADO EXTRA',
      'ATACADAO DISTRIB',
      'DIA SUPERMERCADO',
      'SUPERM BOM PRECO',
    ],
  },
  {
    category: 'Transporte',
    type: 'debit',
    amountRange: [8, 200],
    weight: 18,
    templates: [
      'MP *UBER TRIP',
      'UBER * TRIP HELP.UBER.CO',
      '99APP* 99TAXI',
      'POSTO IPIRANGA',
      'POSTO SHELL BR',
      'ESTAC ZUL',
      'BILHETE UNICO SPTRANS',
      'POSTO IPIRANGA COMB',
    ],
  },
  {
    category: 'Moradia',
    type: 'debit',
    amountRange: [80, 2200],
    weight: 8,
    templates: [
      'TRANSF ALUGUEL IMOB XYZ',
      'CONDOMINIO ED SOLAR',
      'ENEL SP DISTRIB ENERGIA',
      'SABESP AGUA ESGOTO',
      'COMGAS DISTRIBUIDORA',
    ],
  },
  {
    category: 'Saúde',
    type: 'debit',
    amountRange: [20, 600],
    weight: 8,
    templates: [
      'DROGARIA SP FARMA',
      'DROGASIL',
      'UNIMED PLANO SAUDE',
      'CLINICA SAO LUCAS',
      'PAG*FARMACIAPAGUEMENOS',
      'LABORATORIO FLEURY',
    ],
  },
  {
    category: 'Educação',
    type: 'debit',
    amountRange: [30, 900],
    weight: 5,
    templates: [
      'MENSALIDADE FACULDADE XYZ',
      'PAG*UDEMY',
      'PAG*ALURA CURSOS',
      'LIVRARIA CULTURA',
    ],
  },
  {
    category: 'Lazer',
    type: 'debit',
    amountRange: [15, 250],
    weight: 8,
    templates: [
      'PAG*NETFLIX.COM',
      'PAG*SPOTIFY',
      'CINEMARK SHOPPING',
      'PAG*STEAMGAMES',
      'PAG*DISNEYPLUS',
      'PAG*HBOMAX',
    ],
  },
  {
    category: 'Vestuário',
    type: 'debit',
    amountRange: [50, 500],
    weight: 5,
    templates: ['RENNER LOJAS', 'C&A MODAS', 'PAG*ZARA BRASIL', 'NIKE STORE'],
  },
  {
    category: 'Serviços',
    type: 'debit',
    amountRange: [20, 300],
    weight: 6,
    templates: [
      'PAG*CARTORIO 4 OFICIO',
      'BARBEARIA DO ZE',
      'PAG*ADOBE CREATIVE',
      'PAG*CANVA',
      'PAG*99APP ASSINATURA',
    ],
  },
  {
    category: 'Transferências',
    type: 'debit',
    amountRange: [20, 1500],
    weight: 6,
    templates: ['PIX ENVIADO JOAO S', 'PIX ENVIADO MARIA F', 'TED ENVIADA BANCO XP', 'PIX ENVIADO ALUGUEL'],
  },
  {
    category: 'Renda',
    type: 'credit',
    amountRange: [800, 8000],
    weight: 4,
    templates: ['SALARIO EMPRESA XYZ LTDA', 'PIX RECEBIDO CLIENTE PJ', 'DEPOSITO PROVENTOS', 'PAGTO FREELANCE'],
  },
  {
    category: 'Taxas e Tarifas',
    type: 'debit',
    amountRange: [5, 90],
    weight: 5,
    templates: ['TARIFA PACOTE SERVICOS', 'TARIFA MANUTENCAO CONTA', 'IOF COMPRA INTERNACIONAL', 'JUROS ROTATIVO CARTAO'],
  },
  {
    category: 'Outros',
    type: 'debit',
    amountRange: [10, 300],
    weight: 5,
    templates: ['COMPRA DEBITO ESTAB', 'PAGAMENTO DIVERSOS', 'TRANSACAO NAO IDENTIFICADA'],
  },
];

function weightedGroup(): TemplateGroup {
  const total = GROUPS.reduce((sum, g) => sum + g.weight, 0);
  let r = Math.random() * total;
  for (const g of GROUPS) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return GROUPS[GROUPS.length - 1]!;
}

function randomDate(): Date {
  const now = Date.now();
  const daysAgo = Math.floor(Math.random() * 120);
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000);
}

const TOTAL = 150;

async function seed() {
  const generated = Array.from({ length: TOTAL }, () => {
    const group = weightedGroup();
    const template = pick(group.templates);
    return {
      category: group.category,
      row: {
        description: `${template}${suffix()}`,
        amount: randomAmount(group.amountRange[0], group.amountRange[1]),
        transactionDate: randomDate(),
        type: group.type,
      },
    };
  });

  await db.execute(sql`TRUNCATE TABLE classifications, eval_labels, transactions RESTART IDENTITY CASCADE`);
  await db.insert(transactions).values(generated.map((g) => g.row));

  const counts = generated.reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = (acc[g.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Seed concluído: ${generated.length} transações inseridas.`);
  console.table(counts);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
