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

export const C = {
  bg: "#0f0b1e",
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  dark: "#3C3489",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

export const FOCUS_OPTIONS = [
  { id: "amor", label: "Amor e Relacionamentos" },
  { id: "carreira", label: "Carreira e Propósito" },
  { id: "dinheiro", label: "Dinheiro e Prosperidade" },
  { id: "autoconhecimento", label: "Autoconhecimento" },
  { id: "familia", label: "Família e Origens" },
  { id: "saude", label: "Energia e Saúde" },
];

export const MONTHS = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export interface DashboardData {
  total_clients: number;
  new_today: number;
  this_week: number;
  pending: number;
  ready: number;
  conversion_rate: number;
  distribution_by_sign: { sign: string; count: number }[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  status: string;
  focus_areas: string[];
  created_at: string;
  email_status: string;
  email_sent_at: string | null;
}

export interface ClientDetail {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_state: string;
  email_status: string;
  email_sent_at: string | null;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  focus_areas: string[];
  form_vida_agora: string;
  form_carrega_tempo: string;
  form_espera_descobrir: string;
  chart: {
    id: string;
    svg_content: string;
    chart_data: unknown;
    status: string;
  } | null;
  sections: { section_key: string; section_order: number; content: string }[];
}
