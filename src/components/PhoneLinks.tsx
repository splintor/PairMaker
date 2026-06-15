import { telHref, whatsappHref } from "@/lib/phone";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.24 8.24-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.24-8.24zM8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.72 2.74 4.25 3.74 2.1.83 2.53.66 2.99.62.46-.04 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.22-.16-.46-.28-.24-.12-1.48-.73-1.71-.82-.23-.08-.4-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.53.07-.24-.12-1.03-.38-1.96-1.21-.72-.65-1.21-1.45-1.35-1.69-.14-.25-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.14.16-.25.24-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42-.14 0-.3-.02-.46-.02z" />
    </svg>
  );
}

/** Phone value: a `tel:` link plus a WhatsApp link to wa.me. Rendered LTR. */
export function PhoneLinks({ phone }: { phone: string }) {
  return (
    <span dir="ltr" className="inline-flex items-center gap-2">
      <a
        href={whatsappHref(phone)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="שליחת הודעת וואטסאפ"
        title="וואטסאפ"
        className="text-emerald-600 hover:text-emerald-700"
      >
        <WhatsAppIcon />
      </a>
      <a href={telHref(phone)} className="text-brand-700 hover:underline">
        {phone}
      </a>
    </span>
  );
}
