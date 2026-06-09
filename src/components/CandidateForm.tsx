import { FIELDS, type FieldDef } from "@/lib/fields";
import { PrimaryButton, LinkButton } from "@/components/ui";
import { Select } from "@/components/Select";

type Values = Record<string, string | number | null | undefined>;

function Input({ field, value }: { field: FieldDef; value: string }) {
  const base = "w-full rounded-lg border border-brand-200 px-3 py-2.5 text-right";
  if (field.type === "longtext") {
    return <textarea name={field.key} dir="rtl" defaultValue={value} rows={3} className={base} />;
  }
  if (field.type === "select") {
    return <Select name={field.key} options={field.options ?? []} defaultValue={value} />;
  }
  return (
    <input
      name={field.key}
      dir="rtl"
      type={field.type === "number" ? "number" : "text"}
      defaultValue={value}
      required={field.required}
      className={base}
    />
  );
}

export function CandidateForm({
  action,
  values = {},
  submitLabel,
  cancelHref,
  hasError = false,
}: {
  action: (formData: FormData) => void;
  values?: Values;
  submitLabel: string;
  cancelHref: string;
  hasError?: boolean;
}) {
  const groups = [...new Set(FIELDS.map((f) => f.group ?? "כללי"))];
  return (
    <form action={action} className="space-y-6">
      {hasError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          נא לתקן את השדות המסומנים (שדות חובה / ערכים לא תקינים).
        </p>
      )}
      {groups.map((group) => (
        <fieldset key={group} className="rounded-xl2 border border-brand-200 bg-white p-5">
          <legend className="px-2 text-sm font-bold text-brand-700">{group}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.filter((f) => (f.group ?? "כללי") === group).map((field) => (
              <label key={field.key} className={field.type === "longtext" ? "sm:col-span-2" : ""}>
                <span className="mb-1 block text-sm text-slate-600">
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </span>
                <Input field={field} value={values[field.key] == null ? "" : String(values[field.key])} />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-3">
        <PrimaryButton>{submitLabel}</PrimaryButton>
        <LinkButton href={cancelHref}>ביטול</LinkButton>
      </div>
    </form>
  );
}
