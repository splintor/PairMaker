"use client";

import { copyImageToClipboard } from "@/lib/clipboard";
import { whatsappHref } from "@/lib/phone";
import { buildIntroMessage, type IntroParty } from "@/lib/intro-message";
import { logIntroContact } from "@/app/app/matches/actions";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

/**
 * "שליחת הודעה ל{recipient}" — opens a WhatsApp chat with the recipient,
 * prefilled with an invitation to contact `intro`. On click it also best-effort
 * copies the intro person's photo to the clipboard (the matchmaker pastes it
 * into the chat — wa.me links can't attach an image). The anchor's own
 * navigation opens WhatsApp, so the copy never blocks / triggers a popup block.
 */
export function SendIntroButton({
  suggestionId,
  recipientId,
  recipientName,
  recipientGender,
  recipientPhone,
  intro,
  introPhotoSrc,
}: {
  suggestionId: string;
  recipientId: string;
  recipientName: string;
  recipientGender: "male" | "female";
  recipientPhone: string;
  intro: IntroParty;
  introPhotoSrc: string | null;
}) {
  const href = whatsappHref(recipientPhone, buildIntroMessage({ name: recipientName, gender: recipientGender }, intro));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (introPhotoSrc) void copyImageToClipboard(introPhotoSrc);
        void logIntroContact(suggestionId, recipientId);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
    >
      <WhatsAppIcon />
      שליחת הודעה ל{recipientName}
    </a>
  );
}
