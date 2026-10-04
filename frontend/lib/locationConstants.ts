export interface CityOption {
  display: string;
  flag: string;
  city: string;
  state: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  tz_str: string;
}

export const BRAZIL_STATES = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" }, { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" }, { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" }, { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" }, { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" }, { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" }, { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" },
];

export const COUNTRIES = [
  { code: "BR", name: "Brasil", flag: "🇧🇷" }, { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" }, { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾" }, { code: "ES", name: "Espanha", flag: "🇪🇸" },
  { code: "IT", name: "Itália", flag: "🇮🇹" }, { code: "FR", name: "França", flag: "🇫🇷" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪" }, { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
];

export const ZODIAC_SIGNS = [
  "Áries", "Touro", "Gêmeos", "Câncer",
  "Leão", "Virgem", "Libra", "Escorpião",
  "Sagitário", "Capricórnio", "Aquário", "Peixes",
];
