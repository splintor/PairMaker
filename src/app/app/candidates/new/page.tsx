import { requireMembership } from "@/lib/community";
import { CandidateForm } from "@/components/CandidateForm";
import { createCandidate } from "@/app/app/candidates/actions";

export default async function NewCandidatePage() {
  await requireMembership();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-700">מועמד חדש</h1>
      <CandidateForm
        action={createCandidate}
        submitLabel="הוספה"
        cancelHref="/app/candidates"
      />
    </div>
  );
}
