"use client";

import { useState } from "react";
import { FIELDS, GENDER_OPTIONS, type FieldDef } from "@/lib/fields";
import { smokingLabel, requirementsLabel, relationLabel, familyStatusLabel } from "@/lib/candidate-display";
import { LinkButton } from "@/components/ui";
import { PendingButton } from "@/components/PendingButton";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Select, type SelectOption } from "@/components/Select";
import { SegmentedToggle, type ToggleOption } from "@/components/SegmentedToggle";

type Values = Record<string, string | number | null | undefined>;
type Gender = "male" | "female" | null;

const asGender = (g: string): Gender => (g === "male" || g === "female" ? g : null);

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

/** Gender-matched family-status options (slash form until gender is chosen). */
function familyStatusOptions(gender: string): SelectOption[] {
  const g = asGender(gender);
  return ["single", "divorced", "widowed"].map((value) => ({ value, label: familyStatusLabel(value, g) }));
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
  photos = [],
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => void;
  values?: Values;
  photos?: string[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [gender, setGender] = useState(values.gender == null ? "" : String(values.gender));
  const [familyStatus, setFamilyStatus] = useState(values.familyStatus == null ? "single" : String(values.familyStatus));
  const [genderError, setGenderError] = useState(false);
  const groups = [...new Set(FIELDS.map((f) => f.group ?? "כללי"))];

  function control(field: FieldDef, value: string) {
    if (field.key === "gender") {
      return (
        <>
          <SegmentedToggle
            name="gender"
            options={GENDER_OPTIONS}
            value={gender}
            onChange={(v) => {
              setGender(v);
              setGenderError(false);
            }}
          />
          {genderError && <span className="mt-1 block text-xs text-red-500">יש לבחור מגדר</span>}
        </>
      );
    }
    if (field.key === "familyStatus") {
      return (
        <Select
          name={field.key}
          options={familyStatusOptions(gender)}
          defaultValue={value || "single"}
          includeEmpty={false}
          onChange={setFamilyStatus}
        />
      );
    }
    if (field.key === "smoking" && field.widget === "toggle") {
      return <SegmentedToggle name={field.key} options={smokingOptions(gender)} defaultValue={value || "false"} />;
    }
    if (field.widget === "toggle" && field.options) {
      return <SegmentedToggle name={field.key} options={field.options} defaultValue={value} />;
    }
    return <Input field={field} value={value} />;
  }

  // Client-side guard: gender (a toggle, no native required) must be chosen.
  // Done in onSubmit (not by wrapping `action`) so a blocked submit never runs
  // the action — otherwise React 19 would reset the uncontrolled fields.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!gender) {
      e.preventDefault();
      setGenderError(true);
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-6">
      <PhotoPicker
        name="photos"
        defaultPhotos={photos}
        candidateId={typeof values.id === "string" ? values.id : undefined}
      />
      {groups.map((group) => (
        <fieldset key={group} className="rounded-xl2 border border-brand-200 bg-white p-5">
          <legend className="px-2 text-sm font-bold text-brand-700">{group}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.filter((f) => (f.group ?? "כללי") === group).map((field) => {
              // מספר ילדים is irrelevant for a single candidate.
              if (field.key === "children" && familyStatus === "single") return null;
              const value = values[field.key] == null ? "" : String(values[field.key]);
              const isToggle = field.key === "gender" || field.widget === "toggle";
              // relation spans full width so it always sits on its own row below
              // children — children toggling visibility then can't shift it.
              const span =
                field.type === "longtext" || field.key === "smoking" || field.key === "relation" ? "sm:col-span-2" : "";
              // Some form labels are gender-matched to the candidate.
              const labelText =
                field.key === "requirements"
                  ? requirementsLabel(asGender(gender))
                  : field.key === "relation"
                    ? relationLabel(asGender(gender))
                    : field.label;
              const labelInner = (
                <>
                  <span className="mb-1 block text-sm text-slate-600">
                    {labelText}
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
