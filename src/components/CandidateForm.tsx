"use client";

import { useState } from "react";
import { FIELDS, GENDER_OPTIONS, type FieldDef } from "@/lib/fields";
import { smokingLabel, requirementsLabel } from "@/lib/candidate-display";
import { LinkButton } from "@/components/ui";
import { PendingButton } from "@/components/PendingButton";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Select } from "@/components/Select";
import { SegmentedToggle, type ToggleOption } from "@/components/SegmentedToggle";

type Values = Record<string, string | number | null | undefined>;

/** Gender-suited smoking options: מעשן/לא מעשן (male), מעשנת/לא מעשנת (female), slash form when gender is unset. */
function smokingOptions(gender: string): ToggleOption[] {
  if (gender === "male" || gender === "female") {
    const word = smokingLabel(gender); // מעשן / מעשנת
    return [
      { value: "true", label: word },
      { value: "false", label: `לא ${word}` },
    ];
  }
  return [
    { value: "true", label: "מעשן/ת" },
    { value: "false", label: "לא מעשן/ת" },
  ];
}

function Input({ field, value }: { field: FieldDef; value: string }) {
  const base = "w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start";
  if (field.type === "longtext") {
    return <textarea name={field.key} dir="rtl" defaultValue={value} rows={3} className={base} />;
  }
  if (field.type === "boolean") {
    return (
      <input
        type="checkbox"
        name={field.key}
        value="true"
        defaultChecked={value === "true" || value === "on"}
        className="h-5 w-5 rounded border-brand-300 text-brand-600"
      />
    );
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
}: {
  action: (formData: FormData) => void;
  values?: Values;
  submitLabel: string;
  cancelHref: string;
}) {
  const [gender, setGender] = useState(values.gender == null ? "" : String(values.gender));
  const groups = [...new Set(FIELDS.map((f) => f.group ?? "כללי"))];

  function control(field: FieldDef, value: string) {
    if (field.key === "gender") {
      return <SegmentedToggle name="gender" options={GENDER_OPTIONS} value={gender} onChange={setGender} />;
    }
    if (field.key === "smoking" && field.widget === "toggle") {
      return <SegmentedToggle name={field.key} options={smokingOptions(gender)} defaultValue={value || "false"} />;
    }
    if (field.widget === "toggle" && field.options) {
      return <SegmentedToggle name={field.key} options={field.options} defaultValue={value} />;
    }
    return <Input field={field} value={value} />;
  }

  return (
    <form action={action} className="space-y-6">
      <PhotoPicker
        name="photoUrl"
        defaultPhotoUrl={typeof values.photoUrl === "string" ? values.photoUrl : null}
        candidateId={typeof values.id === "string" ? values.id : undefined}
      />
      {groups.map((group) => (
        <fieldset key={group} className="rounded-xl2 border border-brand-200 bg-white p-5">
          <legend className="px-2 text-sm font-bold text-brand-700">{group}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.filter((f) => (f.group ?? "כללי") === group).map((field) => {
              const value = values[field.key] == null ? "" : String(values[field.key]);
              const isToggle = field.key === "gender" || field.widget === "toggle";
              const span = field.type === "longtext" || field.key === "smoking" ? "sm:col-span-2" : "";
              const labelInner = (
                <>
                  <span className="mb-1 block text-sm text-slate-600">
                    {field.key === "requirements"
                      ? requirementsLabel(gender === "male" || gender === "female" ? gender : null)
                      : field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </span>
                  {control(field, value)}
                </>
              );
              // Toggles are buttons — a wrapping <label> would activate the first
              // one on a stray label click, so render those in a <div> instead.
              return isToggle ? (
                <div key={field.key} className={span}>
                  {labelInner}
                </div>
              ) : (
                <label key={field.key} className={span}>
                  {labelInner}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-3">
        <PendingButton>{submitLabel}</PendingButton>
        <LinkButton href={cancelHref}>ביטול</LinkButton>
      </div>
    </form>
  );
}
