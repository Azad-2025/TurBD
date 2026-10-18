import React, { useState } from 'react';
import { Review } from '../types';
import { useApp } from '../context/AppContext';
import { Star, ShieldCheck, MessageSquare, CornerDownRight, Send } from 'lucide-react';

interface ReviewSectionProps {
  turfId: string;
  turfName: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ turfId, turfName }) => {
  const { reviews, addReview, addOwnerReply, currentUser, setIsAuthModalOpen } = useApp();

  const turfReviews = reviews.filter((r) => r.turfId === turfId);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const averageRating =
    turfReviews.length > 0
      ? (turfReviews.reduce((acc, r) => acc + r.rating, 0) / turfReviews.length).toFixed(1)
      : '5.0';

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!comment.trim()) return;

    addReview(turfId, rating, comment.trim());
    setComment('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleReplySubmit = (reviewId: string) => {
    if (!replyComment.trim()) return;
    addOwnerReply(reviewId, replyComment.trim());
    setReplyingToId(null);
    setReplyComment('');
  };

  return (
    <div className="space-y-6" id={`reviews-section-${turfId}`}>
      {/* Header & Rating Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="text-4xl font-black text-[#064E3B] font-mono">{averageRating}</div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(Number(averageRating))
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[#64748B]">
              Based on <span className="font-bold text-[#0F172A]">{turfReviews.length}</span> verified player reviews
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#064E3B] bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-medium">
          <ShieldCheck className="w-4 h-4 text-[#0FA958] shrink-0" />
          <span>Only players with verified matches can review</span>
        </div>
      </div>

      {/* Write a Review Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
        <h4 className="text-sm font-bold text-[#0F172A] mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#0FA958]" />
          Rate &amp; Review {turfName}
        </h4>

        {currentUser ? (
          <form onSubmit={handleReviewSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Your Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-600 ml-2">
                  {rating === 5 ? '5.0 - Excellent Pitch' :
                   rating === 4 ? '4.0 - Very Good' :
                   rating === 3 ? '3.0 - Average' :
                   rating === 2 ? '2.0 - Poor Maintenance' : '1.0 - Unacceptable'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Match Feedback
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience about the turf quality, floodlight visibility, balls/bibs, shower, and staff hospitality..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0FA958] focus:bg-white resize-none"
                required
                id="review-comment-textarea"
              />
            </div>

            <div className="flex items-center justify-between">
              {isSuccess ? (
                <span className="text-xs text-[#064E3B] font-semibold flex items-center gap-1">
                  ✓ Review posted successfully!
                </span>
              ) : (
                <span className="text-[11px] text-[#64748B]">
                  Posting as <strong className="text-slate-800">{currentUser.name}</strong>
                </span>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-soft cursor-pointer"
                id="submit-review-btn"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Review
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <p className="text-xs text-[#64748B]">
              Sign in to share your match review for this venue.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-[#0FA958] hover:bg-[#0D944D] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Sign In to Review
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Player Reviews ({turfReviews.length})
        </h4>

        {turfReviews.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <p className="text-xs text-[#64748B]">No reviews yet for this turf. Be the first player to leave a review!</p>
          </div>
        ) : (
          turfReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-card"
              id={`review-card-${rev.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-xs text-[#064E3B]">
                    {rev.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F172A]">{rev.userName}</span>
                      {rev.verifiedBooking && (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-[#064E3B] border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          ✓ Verified Match
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#64748B]">{rev.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-slate-800 font-mono">{rev.rating}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pl-11">
                {rev.comment}
              </p>

              {/* Owner Response */}
              {rev.ownerReply && (
                <div className="ml-11 bg-emerald-50/60 border-l-2 border-[#0FA958] rounded-r-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#064E3B]">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3 text-[#0FA958]" /> Owner Response
                    </span>
                    <span className="text-[#64748B] font-normal">{rev.ownerReply.date}</span>
                  </div>
                  <p className="text-slate-700 text-xs">{rev.ownerReply.comment}</p>
                </div>
              )}

              {/* Owner/Admin Reply Action (if user is turf owner or admin and no reply yet) */}
              {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && !rev.ownerReply && (
                <div className="pl-11 pt-1">
                  {replyingToId === rev.id ? (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <textarea
                        value={replyComment}
                        onChange={(e) => setReplyComment(e.target.value)}
                        placeholder="Write an official owner reply to this player..."
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#0FA958]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(rev.id)}
                          className="px-3 py-1 bg-[#0FA958] hover:bg-[#0D944D] text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs"
                        >
                          Post Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingToId(rev.id);
                        setReplyComment('');
                      }}
                      className="text-[11px] font-semibold text-[#64748B] hover:text-[#0FA958] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CornerDownRight className="w-3 h-3" /> Reply as Turf Management
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
