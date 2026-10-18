import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Turf } from '../../types';
import {
  Image as ImageIcon,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FileImage,
} from 'lucide-react';

interface OwnerGalleryModalProps {
  turf: Turf;
  onClose: () => void;
  onUpdated: (updatedTurf: any) => void;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
}

export const OwnerGalleryModal: React.FC<OwnerGalleryModalProps> = ({
  turf,
  onClose,
  onUpdated,
}) => {
  const [images, setImages] = useState<string[]>(turf.images || []);
  const [mainImage, setMainImage] = useState<string>(turf.mainImage || turf.images?.[0] || '');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      stagedFiles.forEach((sf) => URL.revokeObjectURL(sf.previewUrl));
    };
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getTurfGallery(turf.id);
      setImages(data.images || []);
      setMainImage(data.mainImage || (data.images && data.images[0]) || '');
    } catch (err: any) {
      console.error('Failed to load gallery:', err);
      setErrorMsg(err.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [turf.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newStaged: StagedFile[] = (Array.from(files) as File[]).map((file: File) => ({
      id: `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
    // Reset file input so user can pick the same file again if desired
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllStaged = () => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setStagedFiles([]);
  };

  const handleSetCover = async (imgUrl: string) => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.setTurfGalleryCover(turf.id, imgUrl);
      setMainImage(res.mainImage);
      setImages(res.images);
      setSuccessMsg('Cover photo updated successfully!');
      onUpdated({ ...turf, mainImage: res.mainImage, images: res.images });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set cover photo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMove = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newOrder = [...images];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await api.reorderTurfGallery(turf.id, newOrder);
      setImages(res.images);
      setSuccessMsg('Gallery order saved.');
      onUpdated({ ...turf, images: res.images });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reorder images');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (imgUrl: string) => {
    if (!confirm('Are you sure you want to remove this photo from the gallery?')) return;
    if (images.length <= 1) {
      setErrorMsg('Turf must have at least one photo in the gallery.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.deleteTurfGalleryImage(turf.id, { imageUrl: imgUrl });
      setImages(res.images);
      setMainImage(res.mainImage);
      setSuccessMsg('Photo removed from gallery.');
      onUpdated({ ...turf, images: res.images, mainImage: res.mainImage });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete photo');
    } finally {
      setActionLoading(false);
    }
  };

  // Replace an existing photo with a newly uploaded file
  const handleTriggerReplace = (index: number) => {
    setReplacingIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleExecuteReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) {
      setReplacingIndex(null);
      return;
    }

    const targetIdx = replacingIndex;
    const oldUrl = images[targetIdx];

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('images', file);
      formData.append('image', file);
      formData.append('category', 'gallery');
      formData.append('turfId', String(turf.id));

      const uploadRes = await api.uploadImage(formData);
      const newUrl = uploadRes.url || uploadRes.imageUrl;

      if (!newUrl) {
        throw new Error('Upload succeeded but no image URL was returned.');
      }

      // Replace URL in array
      const newImages = [...images];
      newImages[targetIdx] = newUrl;

      // Update gallery ordering with swapped image
      const reorderRes = await api.reorderTurfGallery(turf.id, newImages);

      // If this photo was the cover image, update cover image as well
      let updatedMain = mainImage;
      if (oldUrl === mainImage) {
        const coverRes = await api.setTurfGalleryCover(turf.id, newUrl);
        updatedMain = coverRes.mainImage;
      }

      // Cleanup old image from R2 if possible
      api.deleteTurfGalleryImage(turf.id, { imageUrl: oldUrl }).catch(() => {});

      setImages(reorderRes.images);
      setMainImage(updatedMain);
      setSuccessMsg(`Photo #${targetIdx + 1} replaced successfully with Cloudflare R2 durable storage.`);
      onUpdated({ ...turf, images: reorderRes.images, mainImage: updatedMain });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to replace gallery photo');
    } finally {
      setActionLoading(false);
      setReplacingIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleAddImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim() && stagedFiles.length === 0) {
      setErrorMsg('Please choose photo file(s) or enter an image URL to add.');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const finalUrls: string[] = [];

      // 1. Process and upload any staged real image files
      if (stagedFiles.length > 0) {
        const formData = new FormData();
        stagedFiles.forEach((sf) => {
          formData.append('images', sf.file);
          formData.append('image', sf.file);
        });
        formData.append('category', 'gallery');
        formData.append('turfId', String(turf.id));

        const uploadRes = await api.uploadImage(formData);
        const uploadedList = uploadRes.files || uploadRes.images || [];

        if (Array.isArray(uploadedList) && uploadedList.length > 0) {
          uploadedList.forEach((item: any) => {
            if (item.imageUrl) finalUrls.push(item.imageUrl);
          });
        } else if (uploadRes.imageUrl || uploadRes.url) {
          finalUrls.push(uploadRes.imageUrl || uploadRes.url);
        }
      }

      // 2. Add direct image URL if specified
      if (newImageUrl.trim()) {
        finalUrls.push(newImageUrl.trim());
      }

      if (finalUrls.length === 0) {
        throw new Error('No images were prepared for saving.');
      }

      const res = await api.addTurfGalleryImages(turf.id, finalUrls);
      setImages(res.images);
      setMainImage(res.mainImage);
      setNewImageUrl('');
      clearAllStaged();
      setSuccessMsg(
        `${finalUrls.length} new photo(s) added and stored persistently in Cloudflare R2!`
      );
      onUpdated({ ...turf, images: res.images, mainImage: res.mainImage });
    } catch (err: any) {
      console.error('Gallery add error:', err);
      setErrorMsg(err.message || 'Failed to add image(s) to gallery');
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-modal border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Hidden File Input for Single Photo Replacement */}
        <input
          type="file"
          ref={replaceInputRef}
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="hidden"
          onChange={handleExecuteReplace}
        />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#0FA958]" />
              Manage Turf Gallery: {turf.name}
            </h3>
            <p className="text-xs text-[#64748B]">
              Upload genuine venue photos to persistent cloud storage, set cover photo, reorder showcase, and replace photos
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Upload / Add Photo Bar */}
        <form onSubmit={handleAddImages} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#0FA958]" />
              Upload Photos from Computer / Phone Gallery
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              Persistent Cloud Storage • Auto WebP & Thumbnailing
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* File Picker from File Manager or Phone Gallery */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Choose Image File(s)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileSelect}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0FA958]/10 file:text-[#064E3B] hover:file:bg-[#0FA958]/20 cursor-pointer"
              />
            </div>

            {/* Direct Image URL input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Or Direct Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0FA958]"
              />
            </div>
          </div>

          {/* Staged File Previews before confirmation */}
          {stagedFiles.length > 0 && (
            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <FileImage className="w-3.5 h-3.5 text-[#0FA958]" />
                  Selected Photos Preview ({stagedFiles.length})
                </span>
                <button
                  type="button"
                  onClick={clearAllStaged}
                  className="text-[10px] text-slate-500 hover:text-red-600 font-semibold cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stagedFiles.map((staged) => (
                  <div
                    key={staged.id}
                    className="relative group bg-white border border-slate-200 rounded-xl overflow-hidden p-1 shadow-xs"
                  >
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 relative">
                      <img
                        src={staged.previewUrl}
                        alt={staged.file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeStagedFile(staged.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Remove photo from upload queue"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-1">
                      <p className="text-[10px] font-semibold text-slate-700 truncate" title={staged.file.name}>
                        {staged.file.name}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {formatFileSize(staged.file.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={actionLoading || (!newImageUrl && stagedFiles.length === 0)}
              className="px-4 py-2 bg-[#0FA958] hover:bg-[#0D944D] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing & Storing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Upload & Add to Gallery
                    {stagedFiles.length > 0 ? ` (${stagedFiles.length} file${stagedFiles.length > 1 ? 's' : ''})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0FA958]" />
              <p className="text-xs">Loading turf gallery photos...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No photos in gallery</p>
              <p className="text-[11px] text-slate-400">Add photos above to attract players</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img, idx) => {
                const isCover = img === mainImage || idx === 0;

                return (
                  <div
                    key={idx}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all bg-slate-900 ${
                      isCover ? 'border-[#0FA958] shadow-md ring-2 ring-[#0FA958]/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <img
                        src={img}
                        alt={`Turf photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    {/* Cover Badge */}
                    {isCover && (
                      <div className="absolute top-2 left-2 bg-[#0FA958] text-white px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Cover Photo</span>
                      </div>
                    )}

                    {/* Image index indicator */}
                    <div className="absolute top-2 right-2 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                      #{idx + 1}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="p-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-1 flex-wrap">
                      {/* Set Cover button */}
                      {!isCover ? (
                        <button
                          type="button"
                          onClick={() => handleSetCover(img)}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-amber-200 cursor-pointer"
                          title="Set as main cover image displayed on venue listings"
                        >
                          <Star className="w-3 h-3" />
                          <span>Make Cover</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-[#064E3B] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#0FA958]" />
                          Active Cover
                        </span>
                      )}

                      {/* Replace photo button */}
                      <button
                        type="button"
                        onClick={() => handleTriggerReplace(idx)}
                        disabled={actionLoading}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Replace this photo with a new upload"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Replace</span>
                      </button>

                      {/* Move left / right / delete */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'left')}
                          disabled={actionLoading || idx === 0}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                          title="Move earlier in gallery"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(idx, 'right')}
                          disabled={actionLoading || idx === images.length - 1}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                          title="Move later in gallery"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(img)}
                          disabled={actionLoading}
                          className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer ml-1"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Total Photos: <strong>{images.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
