export interface Member {
  id: number;
  name: string;
  pai_name: string | null;
  generation_id: number;
  gen_number: number;
  gen_pai_zi: string;
  gender: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_hour: number | null;
  birth_minute: number | null;
  is_deceased: number;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_hour: number | null;
  death_minute: number | null;
  father_id: number | null;
  father_order: number | null;
  spouse_info: Spouse[];
  avatar: string | null;
  notes: string | null;
  burial: string | null;
  residence: string | null;
  is_adopted: number;
  adoption_note: string | null;
  is_shang: number;
  has_posterity: number;
  order_index: number;
  children?: Member[];
}

export interface Spouse {
  name: string;
  birth: string;
  death: string;
  note: string;
  detail?: string;
}

export interface Generation {
  id: number;
  number: number;
  pai_zi: string;
  description: string;
}

export interface Statistics {
  total: number;
  living: number;
  deceased: number;
  deceased_unknown: number;
  male: number;
  female: number;
  post80s: number;
  post90s: number;
  post00s: number;
  adopted: number;
  byGeneration: { generation: number; pai_zi: string; count: number }[];
  byGenerationLiving: { generation: number; pai_zi: string; living: number; deceased: number; deceased_unknown: number }[];
}
