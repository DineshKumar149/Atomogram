import { useState, useRef, useCallback } from "react";
import { X, Upload, ImageIcon, VideoIcon, Loader2, Wand2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { addHours } from "date-fns";
import FilerobotEditor from "@/components/editor/FilerobotEditor";

interface CreateStoryProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateStory({ onClose, onCreated }: CreateStoryProps) {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [scheduledForDate, setScheduledForDate] = useState("");
  const [scheduledForTime, setScheduledForTime] = useState("");
  // Edited blob from FilerobotEditor (only applies if 1 file is selected)
  const [editedBlob, setEditedBlob] = useState<Blob | null>(null);
  const [editedMimeType, setEditedMimeType] = useState<string>("image/png");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: File[]) => {
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast({ title: "Invalid file", description: `${file.name} is not an image or video.`, variant: "destructive" });
        return false;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 100MB limit.`, variant: "destructive" });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setSelectedFiles(validFiles);
    setEditedBlob(null);

    const urls = validFiles.map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);
    setCurrentSlide(0);
    
    const type = validFiles[0].type.startsWith("video/") ? "video" : "image";
    setMediaType(type);

    // Automatically open the editor if exactly 1 image is selected
    if (validFiles.length === 1 && type === "image") {
      setShowEditor(true);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFileSelect(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleEditorSave = useCallback((blob: Blob, mimeType: string) => {
    setEditedBlob(blob);
    setEditedMimeType(mimeType);

    if (previewUrls.length > 0) {
      URL.revokeObjectURL(previewUrls[0]);
    }
    const newUrl = URL.createObjectURL(blob);
    setPreviewUrls([newUrl]);

    if (mimeType.startsWith("video/")) {
      setMediaType("video");
    } else {
      setMediaType("image");
    }

    setShowEditor(false);

    toast({
      title: "Edit applied ✨",
      description: "Your media has been edited. Click Share Story to publish.",
    });
  }, [previewUrls]);

  const uploadSingleFile = async (file: File | Blob, mimeType: string, originalName: string) => {
    const ext = mimeType.startsWith("video/") ? "mp4" : (originalName.split(".").pop() || "jpg");
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const filePath = `stories/${user?.id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: mimeType });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleUpload = async () => {
    if ((selectedFiles.length === 0 && !editedBlob) || !user) return;

    setUploading(true);

    try {
      const expiresAt = addHours(new Date(), 24).toISOString();
      let scheduledDt = null;
      if (scheduledForDate && scheduledForTime) {
        scheduledDt = new Date(`${scheduledForDate}T${scheduledForTime}`).toISOString();
      }

      if (editedBlob) {
        // Upload edited single file
        const mediaUrl = await uploadSingleFile(editedBlob, editedMimeType, "edited.png");
        await supabase.from("stories").insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption.trim() || null,
          expires_at: expiresAt,
          scheduled_for: scheduledDt,
          status: scheduledDt ? "scheduled" : "published",
        });
      } else {
        // Upload multiple files sequentially
        const storyInserts = [];
        for (const file of selectedFiles) {
          const mediaUrl = await uploadSingleFile(file, file.type, file.name);
          storyInserts.push({
            user_id: user.id,
            media_url: mediaUrl,
            media_type: file.type.startsWith("video/") ? "video" : "image",
            caption: caption.trim() || null,
            expires_at: expiresAt,
            scheduled_for: scheduledDt,
            status: scheduledDt ? "scheduled" : "published",
          });
        }
        await supabase.from("stories").insert(storyInserts);
      }

      toast({
        title: "Story published! ✨",
        description: selectedFiles.length > 1 ? "Your stories will be visible for 24 hours." : "Your story will be visible for 24 hours.",
      });

      onCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setEditedBlob(null);
    setPreviewUrls([]);
    setCurrentSlide(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Show FilerobotEditor full-screen
  if (showEditor) {
    return (
      <FilerobotEditor
        onSave={handleEditorSave}
        onClose={() => setShowEditor(false)}
        initialMediaUrl={previewUrls[0] || undefined}
        title="Edit Image Story"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 600, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(15, 15, 30, 0.95)",
          border: "1px solid rgba(99,102,241,0.25)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
            <h2 className="text-white font-semibold text-lg tracking-tight">Create Story</h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Media upload / preview area */}
          {previewUrls.length === 0 ? (
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 py-12 ${
                dragOver
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-white/20 hover:border-indigo-500/50 hover:bg-white/5"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-sm">Drop your media here</p>
                <p className="text-white/40 text-xs mt-1">Select multiple files at once</p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <ImageIcon className="w-3 h-3 text-indigo-400" />
                  <span className="text-xs text-white/50">Images</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <VideoIcon className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-white/50">Videos</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-72 bg-black">
              {selectedFiles[currentSlide]?.type.startsWith("video/") || (editedBlob && editedMimeType.startsWith("video/")) ? (
                <video
                  src={previewUrls[currentSlide]}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
              ) : (
                <img
                  src={previewUrls[currentSlide]}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Remove button */}
              <button
                onClick={handleRemoveFile}
                disabled={uploading}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Media type badge */}
              <div className="absolute bottom-2 left-2 z-10">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    selectedFiles[currentSlide]?.type.startsWith("video/")
                      ? "bg-purple-600/80 text-white"
                      : "bg-indigo-600/80 text-white"
                  }`}
                >
                  {editedBlob ? "✨ Edited" : selectedFiles[currentSlide]?.type.startsWith("video/") ? "Video" : "Image"}
                </span>
              </div>

              {/* Carousel Navigation */}
              {previewUrls.length > 1 && (
                <>
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm z-10">
                    {currentSlide + 1}/{previewUrls.length}
                  </div>
                  {currentSlide > 0 && (
                    <button
                      onClick={() => setCurrentSlide(s => s - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentSlide < previewUrls.length - 1 && (
                    <button
                      onClick={() => setCurrentSlide(s => s + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}

              {/* Edit with FilerobotEditor button — only for single image */}
              {selectedFiles.length === 1 && mediaType === "image" && (
                <button
                  onClick={() => setShowEditor(true)}
                  disabled={uploading}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg transition-all z-10"
                >
                  <Wand2 className="w-3 h-3" />
                  Edit Photo
                </button>
              )}
            </div>
          )}

          {/* Caption input */}
          <div className="flex flex-col gap-2">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">
              Caption <span className="text-white/30 normal-case">(optional, applied to all)</span>
            </label>
            <Textarea
              placeholder="Write a caption for your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              rows={3}
              disabled={uploading}
              className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/60 rounded-xl text-sm"
            />
            <div className="flex justify-end">
              <span className="text-white/30 text-xs">{caption.length}/200</span>
            </div>
          </div>

          {/* Schedule Input */}
          <div className="flex flex-col gap-2 mb-1 bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-xs font-semibold text-white/80">Schedule story (Optional)</span>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="h-8 text-xs flex-1 bg-transparent border border-white/20 rounded-md px-2 text-white" 
                value={scheduledForDate}
                onChange={e => setScheduledForDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <input 
                type="time" 
                className="h-8 text-xs flex-1 bg-transparent border border-white/20 rounded-md px-2 text-white" 
                value={scheduledForTime}
                onChange={e => setScheduledForTime(e.target.value)}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent border-white/15 text-white/70 hover:bg-white/5 hover:text-white rounded-xl"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border-0 transition-all disabled:opacity-60"
              onClick={handleUpload}
              disabled={(previewUrls.length === 0) || uploading}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Share Stor{selectedFiles.length > 1 ? 'ies' : 'y'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
