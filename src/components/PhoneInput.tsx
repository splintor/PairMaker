"use client";

import { normalizePhone } from "@/lib/phone";

/**
 * Uncontrolled phone input that normalizes its value on blur (e.g. turns
 * "+972 52-537-4917" into "0525374917"). Mirrors the candidate form's phone
 * field; use inside plain <form> submissions.
 */
export function PhoneInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="tel"
      dir="ltr"
      {...props}
      onBlur={(e) => {
        e.target.value = normalizePhone(e.target.value);
        props.onBlur?.(e);
      }}
    />
  );
}
