"use client";

import { whatsappHref } from "@/lib/phone";
import { buildMemberPitchMessage } from "@/lib/intro-message";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

/**
 * "שליחה ל{creator}" — opens a WhatsApp chat with the member who added the
 * listed candidate, prefilled with a pitch to match them with the source
 * candidate (linked). Shown only when that member has a phone and isn't the
 * current user (gated by the caller).
 */
export function SendToMemberButton({
  creatorName,
  creatorPhone,
  theirCandidate,
  myCandidate,
  myCandidateUrl,
}: {
  creatorName: string;
  creatorPhone: string;
  theirCandidate: string;
  myCandidate: string;
  myCandidateUrl: string;
}) {
  const href = whatsappHref(creatorPhone, buildMemberPitchMessage({ creatorName, theirCandidate, myCandidate, myCandidateUrl }));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
    >
      <WhatsAppIcon />
      שליחה ל{creatorName}
    </a>
  );
}
