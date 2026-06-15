import { telHref, whatsappHref } from "@/lib/phone";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

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
