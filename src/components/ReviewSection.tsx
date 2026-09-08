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
      <div className="bg-neutral-850 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="text-4xl font-black text-white font-mono">{averageRating}</div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(Number(averageRating))
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-neutral-600'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-neutral-400">
              Based on <span className="font-bold text-white">{turfReviews.length}</span> verified player reviews
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-2 rounded-xl">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Only players with verified matches can review</span>
        </div>
      </div>

      {/* Write a Review Box */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          Rate & Review {turfName}
        </h4>

        {currentUser ? (
          <form onSubmit={handleReviewSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
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
                    className="p-1 text-neutral-600 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-neutral-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-400 ml-2">
                  {rating === 5 ? '5.0 - Excellent Pitch' :
                   rating === 4 ? '4.0 - Very Good' :
                   rating === 3 ? '3.0 - Average' :
                   rating === 2 ? '2.0 - Poor Maintenance' : '1.0 - Unacceptable'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Your Match Feedback
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience about the turf quality, floodlight visibility, balls/bibs, shower, and staff hospitality..."
                rows={3}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
                required
                id="review-comment-textarea"
              />
            </div>

            <div className="flex items-center justify-between">
              {isSuccess ? (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Review posted successfully!
                </span>
              ) : (
                <span className="text-[11px] text-neutral-500">
                  Posting as <strong className="text-neutral-300">{currentUser.name}</strong>
                </span>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                id="submit-review-btn"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Review
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/60 flex items-center justify-between">
            <p className="text-xs text-neutral-400">
              Sign in to share your match review for this venue.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Sign In to Review
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Player Reviews ({turfReviews.length})
        </h4>

        {turfReviews.length === 0 ? (
          <div className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl text-center">
            <p className="text-xs text-neutral-400">No reviews yet for this turf. Be the first player to leave a review!</p>
          </div>
        ) : (
          turfReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3"
              id={`review-card-${rev.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white">
                    {rev.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{rev.userName}</span>
                      {rev.verifiedBooking && (
                        <span className="text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          ✓ Verified Match
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500">{rev.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-700/60">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-white font-mono">{rev.rating}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed pl-11">
                {rev.comment}
              </p>

              {/* Owner Response */}
              {rev.ownerReply && (
                <div className="ml-11 bg-neutral-850 border-l-2 border-emerald-500 rounded-r-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3" /> Owner Response
                    </span>
                    <span className="text-neutral-500 font-normal">{rev.ownerReply.date}</span>
                  </div>
                  <p className="text-neutral-300 text-xs">{rev.ownerReply.comment}</p>
                </div>
              )}

              {/* Owner/Admin Reply Action (if user is turf owner or admin and no reply yet) */}
              {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && !rev.ownerReply && (
                <div className="pl-11 pt-1">
                  {replyingToId === rev.id ? (
                    <div className="space-y-2 bg-neutral-850 p-3 rounded-xl border border-neutral-800">
                      <textarea
                        value={replyComment}
                        onChange={(e) => setReplyComment(e.target.value)}
                        placeholder="Write an official owner reply to this player..."
                        rows={2}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(rev.id)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg"
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
                      className="text-[11px] font-semibold text-neutral-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
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
