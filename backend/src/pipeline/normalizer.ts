const NOISE_PREFIXES = [/^PAG\*/, /^MP\s*\*/, /^IFD\*/, /^TED\*/];

const CITY_UF_SUFFIX =
  /\s+(SAO PAULO|RIO DE JANEIRO|BELO HORIZONTE|CURITIBA|PORTO ALEGRE)?\s*(SP|RJ|BH|MG|PR|RS|POA)$/;

export function normalizeDescriptor(raw: string): string {
  let s = raw.trim().toUpperCase();

  for (const prefix of NOISE_PREFIXES) {
    s = s.replace(prefix, '');
  }

  s = s.replace(/HELP\.UBER\.CO/g, '');
  s = s.replace(CITY_UF_SUFFIX, '');
  s = s.replace(/\b\d{3,}\b/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}
