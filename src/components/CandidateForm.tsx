"use client";

import { useEffect, useRef, useState } from "react";
import { FIELDS, GENDER_OPTIONS, getField, type FieldDef } from "@/lib/fields";
import { smokingLabel, requirementsLabel, requirementsPlaceholder, relationLabel, familyStatusLabel, educationLabel } from "@/lib/candidate-display";
import { LinkButton } from "@/components/ui";
import { PendingButton } from "@/components/PendingButton";
import { PhotoPicker } from "@/components/PhotoPicker";
import { normalizePhone } from "@/lib/phone";
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

/** Education options with the gendered "student" label (slash form until gender is chosen). */
function educationOptions(gender: string): SelectOption[] {
  const g = asGender(gender);
  return (getField("education")!.options ?? []).map(({ value }) => ({ value, label: educationLabel(value, g) }));
}

function Input({ field, value, placeholder }: { field: FieldDef; value: string; placeholder?: string }) {
  const base = "w-full rounded-lg border border-brand-200 px-3 py-2.5 text-start";
  if (field.type === "longtext") {
    return <textarea name={field.key} dir="rtl" defaultValue={value} placeholder={placeholder} rows={3} className={base} />;
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
      onBlur={
        field.key === "phone"
          ? (e) => {
              e.target.value = normalizePhone(e.target.value);
            }
          : undefined
      }
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
  const [showStickyBar, setShowStickyBar] = useState(false);
  const stickyAnchorRef = useRef<HTMLDivElement>(null);
  const groups = [...new Set(FIELDS.map((f) => f.group ?? "כללי"))];

  // Reveal the mobile sticky action bar only once the photo picker has scrolled
  // up to the top of the screen, so it doesn't cover the form while you're at the top.
  useEffect(() => {
    const el = stickyAnchorRef.current;
    if (!el) return;
    const onScroll = () => setShowStickyBar(el.getBoundingClientRect().top <= 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    if (field.key === "education") {
      return <Select name={field.key} options={educationOptions(gender)} defaultValue={value} />;
    }
    if (field.key === "requirements") {
      return <Input field={field} value={value} placeholder={requirementsPlaceholder(asGender(gender))} />;
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
    <form action={action} onSubmit={handleSubmit}>
      {/* Mobile-only action bar; slides in once the photo picker scrolls off the top.
          Kept outside the space-y wrapper so it never picks up a sibling margin
          (a margin would offset this fixed bar and let it peek when hidden). */}
      <div
        className={`fixed inset-x-0 top-0 z-30 flex gap-3 border-b border-brand-200 bg-brand-50/95 px-4 py-3 backdrop-blur transition-transform duration-200 sm:hidden ${
          showStickyBar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <PendingButton>{submitLabel}</PendingButton>
        <LinkButton href={cancelHref}>ביטול</LinkButton>
      </div>
      <div className="space-y-6">
      <div>
        <div ref={stickyAnchorRef} aria-hidden className="h-0" />
        <PhotoPicker
          name="photos"
          defaultPhotos={photos}
          candidateId={typeof values.id === "string" ? values.id : undefined}
        />
      </div>
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
      </div>
    </form>
  );
}
