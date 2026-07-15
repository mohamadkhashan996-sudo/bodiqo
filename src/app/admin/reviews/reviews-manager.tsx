"use client";

import { useState } from "react";
import { approveReview, deleteReview } from "./actions";

type Review = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  approved: boolean;
  createdAt: string;
  productTitle: string;
  productSlug: string;
};

export function ReviewsManager({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  async function handleApprove(id: string, approved: boolean) {
    const result = await approveReview(id, approved);
    if (!result.ok) {
      setMessage(result.error || "Failed");
      return;
    }
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approved } : r)),
    );
    setMessage(approved ? "Review approved" : "Review unapproved");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    const result = await deleteReview(id);
    if (!result.ok) {
      setMessage(result.error || "Failed");
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setMessage("Review deleted");
  }

  return (
    <>
      {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {reviews.length === 0 ? (
          <li className="px-4 py-8 text-sm text-[#f3efe6]/55">No reviews yet.</li>
        ) : (
          reviews.map((r) => (
            <li key={r.id} className="space-y-2 px-4 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {r.author} · {r.rating}/5
                  </p>
                  <p className="text-xs text-[#f3efe6]/40">
                    {r.productTitle} · /product/{r.productSlug}
                  </p>
                </div>
                <span
                  className={
                    r.approved ? "text-[#8fdfb0]" : "text-[#f3efe6]/40"
                  }
                >
                  {r.approved ? "Approved" : "Pending"}
                </span>
              </div>
              {r.title ? <p className="font-medium">{r.title}</p> : null}
              <p className="text-[#f3efe6]/70">{r.body}</p>
              <div className="flex gap-3 pt-1">
                {!r.approved ? (
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id, true)}
                    className="text-[#4a8cff] hover:underline"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id, false)}
                    className="text-[#f3efe6]/55 hover:underline"
                  >
                    Unapprove
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
