import { requireMembership } from "@/lib/community";
import { CandidateForm } from "@/components/CandidateForm";
import { createCandidate } from "@/app/app/candidates/actions";

export default async function NewCandidatePage() {
  await requireMembership();
  return (
    <div className="space-y-4">
      <CandidateForm
        action={createCandidate}
        title="מועמד חדש"
        submitLabel="הוספה"
        cancelHref="/app/candidates"
      />
    </div>
  );
}
