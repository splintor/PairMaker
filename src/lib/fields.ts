export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "select"
  | "multiselect"
  | "boolean";

export type FieldOption = { value: string; label: string };

export type FieldDef = {
  key: string;
  label: string; // Hebrew
  type: FieldType;
  storage: "column" | "details" | "virtual"; // "virtual" = shown in UI, mapped to a real column by the caller (e.g. age→birthdate)
  options?: FieldOption[]; // for select / multiselect
  required?: boolean;
  searchable?: boolean; // surfaced as a search filter in M3
  showInCard?: boolean; // shown on the candidate card
  group?: string; // form section
  widget?: "toggle"; // render a select/boolean as a segmented toggle (instead of dropdown/checkbox)
};

export const GENDER_OPTIONS: FieldOption[] = [
  { value: "male", label: "איש" },
  { value: "female", label: "אישה" },
];

export const FIELDS: FieldDef[] = [
  { key: "name", label: "שם", type: "text", storage: "column", required: true, searchable: true, showInCard: true, group: "כללי" },
  { key: "gender", label: "מגדר", type: "select", storage: "column", required: true, options: GENDER_OPTIONS, searchable: true, showInCard: true, group: "כללי", widget: "toggle" },
  { key: "age", label: "גיל", type: "number", storage: "virtual", searchable: true, showInCard: false, group: "כללי" },
  { key: "occupation", label: "עיסוק", type: "text", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  { key: "heightCm", label: "גובה (ס\"מ)", type: "number", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  { key: "city", label: "עיר", type: "text", storage: "column", searchable: true, showInCard: true, group: "כללי" },
  { key: "phone", label: "מספר טלפון", type: "text", storage: "details", searchable: false, showInCard: false, group: "כללי" },
  // extended fields live in `details` JSONB — demonstrates the no-migration path:
  {
    key: "sector",
    label: "מגזר / זרם",
    type: "select",
    storage: "details",
    options: [
      { value: "dati_leumi", label: "דתי לאומי" },
      { value: "dati_leumi_torani", label: "דתי לאומי תורני" },
      { value: "dati_patuach", label: "דתי פתוח" },
      { value: "datlash", label: "דתל\"ש" },
      { value: "haredi", label: "חרדי" },
      { value: "masorti", label: "מסורתי" },
      { value: "other", label: "אחר" },
    ],
    searchable: true,
    showInCard: false,
    group: "רקע",
  },
  {
    key: "education",
    label: "השכלה",
    type: "select",
    storage: "details",
    options: [
      { value: "highschool", label: "תיכונית" },
      { value: "yeshiva", label: "ישיבה / מדרשה" },
      { value: "bachelor", label: "תואר ראשון" },
      { value: "graduate", label: "תואר מתקדם" },
    ],
    searchable: true,
    showInCard: false,
    group: "רקע",
  },
  {
    key: "smoking",
    label: "עישון",
    type: "boolean",
    storage: "details",
    options: [
      { value: "true", label: "מעשן/ת" },
      { value: "false", label: "לא מעשן/ת" },
    ],
    searchable: true,
    showInCard: true,
    group: "רקע",
    widget: "toggle",
  },
  { key: "requirements", label: "דרישות לבן/בת הזוג", type: "longtext", storage: "column", searchable: true, showInCard: false, group: "דרישות" },
];

export function getField(key: string): FieldDef | undefined {
  return FIELDS.find((f) => f.key === key);
}

export const COLUMN_FIELDS = FIELDS.filter((f) => f.storage === "column");
export const DETAIL_FIELDS = FIELDS.filter((f) => f.storage === "details");
export const SEARCHABLE_FIELDS = FIELDS.filter((f) => f.searchable);
export const CARD_FIELDS = FIELDS.filter((f) => f.showInCard);

export function optionLabel(field: FieldDef, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value;
}

export type BuiltInput = {
  columns: Record<string, string | number | boolean>;
  details: Record<string, string | number | boolean | string[]>;
  errors: Record<string, string>;
};

export function buildCandidateInput(raw: Record<string, unknown>): BuiltInput {
  const columns: Record<string, string | number | boolean> = {};
  const details: Record<string, string | number | boolean | string[]> = {};
  const errors: Record<string, string> = {};

  for (const field of FIELDS) {
    if (field.storage === "virtual") continue; // mapped to a real column by the caller (age→birthdate)

    const rawValue = raw[field.key];

    if (field.type === "boolean") {
      const v = rawValue === "true" || rawValue === "on" || rawValue === "1" || rawValue === true;
      if (field.storage === "column") columns[field.key] = v;
      else details[field.key] = v;
      continue;
    }

    const str = rawValue == null ? "" : String(rawValue).trim();

    if (str === "") {
      if (field.required) errors[field.key] = "שדה חובה";
      continue;
    }

    let value: string | number = str;
    if (field.type === "number") {
      const n = Number(str);
      if (!Number.isFinite(n)) {
        errors[field.key] = "יש להזין מספר";
        continue;
      }
      value = n;
    }
    if ((field.type === "select" || field.type === "multiselect") && field.options) {
      const ok = field.options.some((o) => o.value === str);
      if (!ok) {
        errors[field.key] = "ערך לא חוקי";
        continue;
      }
    }

    if (field.storage === "column") columns[field.key] = value;
    else details[field.key] = value;
  }

  return { columns, details, errors };
}
