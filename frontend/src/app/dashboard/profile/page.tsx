"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { getApiErrorMessage, showToast } from "@/lib/alerts";
import { useToastError } from "@/hooks/useToastError";

// --- Components ---

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardProfilePage() {
  const router = useRouter();

  // --- Store Integration ---
  const authToken = useAppStore((state) => state.authToken);
  const userId = useAppStore((state) => state.userId);
  const user = useAppStore((state) => state.user);
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const updateUser = useAppStore((state) => state.updateUser);
  const uploadProfilePhoto = useAppStore((state) => state.uploadProfilePhoto);
  const deleteAccount = useAppStore((state) => state.deleteAccount);
  const clearAuth = useAppStore((state) => state.clearAuth);
  // --- Local State ---
  const [isLoading, setIsLoading] = useState(true);
  
  // Delete State
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit State
  const [isPhotoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoDraft, setPhotoDraft] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  useToastError(photoError);
  useToastError(deleteError);

  // --- Effects ---
  useEffect(() => {
    if (!authToken || !userId) {
      router.replace("/login");
    }
  }, [authToken, userId, router]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
        if (!authToken || !userId) {
            if (mounted) setIsLoading(false);
            return;
        }
        try {
            await fetchUserProfile();
        } finally {
            if(mounted) setIsLoading(false);
        }
    }
    load();
    return () => { mounted = false; };
  }, [fetchUserProfile, authToken, userId]);

  useEffect(() => {
    if (isPhotoModalOpen && user) {
      setPhotoDraft(user.photoUrl ?? "");
      setPhotoFile(null);
      setPhotoError(null);
    }
  }, [isPhotoModalOpen, user]);

  // --- Derived Dynamic Data ---
  const fullName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Loading...";
  const isVerified = user?.isVerified ?? false;
  const roleValue = Array.isArray(user?.role) ? user?.role[0] : user?.role;
  const roleLabel = roleValue
    ? `${String(roleValue).charAt(0).toUpperCase()}${String(roleValue).slice(1).toLowerCase()}`
    : "Landlord";
  const photoUrl = user?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDfCV60c8Lx3OwS6F6pZlph9DX90dUTo4gA-2YMIEaOfPWkF0OHDzVIPspyJrie7yszZDJ8i3bhK9EnT2M8zTDYy8P4IKH2cs9FIy0PJW0j7AukRcImec7aji1iXCosy05vO23XbOMn2NC5IzoLg_4wAEMKJaEeUhUnvhl1H4GoUSg30PBswRZsVoscA5v1ZuxEZ1pALXC3zJGeTCY1-4rsmKIaTCim5Sr4qpQRoBvLxb1TWRGOIuIaZJ3oxRP0qomRnhWGfzJhIm8P";

  const sections = useMemo(() => [
    { 
        icon: "person", 
        title: "Personal Information", 
        description: [user?.email, user?.phoneNumber].filter(Boolean).join(", ") || "Email, Phone",
    },
    { 
        icon: "verified_user", 
        title: "Identity Verification", 
        description: isVerified ? "Verified Status Active" : "Not Verified", 
        action: isVerified ? undefined : () => router.push("/verify-identity"),
        accent: isVerified 
    },
  ], [user, isVerified, router]);


  // --- Handlers ---
  const handleSignOut = () => {
    clearAuth();
    router.push("/login");
  };

  const handlePhotoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoDraft(previewUrl);
    }
  };

  const handleSavePhoto = async () => {
    if (!uploadProfilePhoto && !updateUser) {
      setPhotoError("Unable to update photo");
      return;
    }
    setIsPhotoSaving(true);
    setPhotoError(null);
    try {
      let nextPhotoUrl = photoDraft;
      if (photoFile && uploadProfilePhoto) {
        const uploadedUrl = await uploadProfilePhoto(photoFile);
        if (uploadedUrl) {
          nextPhotoUrl = uploadedUrl;
        }
      }
      if (updateUser) {
        await updateUser({ photoUrl: nextPhotoUrl });
      }
      showToast({ title: "Photo updated", variant: "success" });
      setPhotoModalOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setPhotoError(message);
      showToast({ title: message, variant: "error" });
    } finally {
      setIsPhotoSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmInput.trim() !== "delete") return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const success = await deleteAccount();
      if (success) {
        clearAuth();
        router.push("/login");
      } else {
        setDeleteError("Unable to delete account. Please try again.");
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
            Loading profile...
        </div>
    );
  }

  return (
    <div className="min-h-screen font-display antialiased flex flex-col pb-28 bg-slate-50 text-slate-900">
      
      {/* --- Header --- */}
      <header className="bg-white px-6 pt-12 pb-8 border-b border-slate-200 shadow-sm relative">
        <div className="flex items-center gap-6 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className=" text-slate-600 hover:bg-slate-50 rounded-full p-3 hidden md:block transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          {/* Avatar */}
          <div
            className="relative shrink-0 group cursor-pointer"
            onClick={() => setPhotoModalOpen(true)}
          >
            <div
              className="h-24 w-24 rounded-full bg-slate-200 bg-cover bg-center border-4 border-white shadow-md group-hover:brightness-90 transition-all"
              style={{
                backgroundImage: `url('${photoUrl}')`,
              }}
            />
             <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white">edit</span>
            </div>

            {isVerified && (
                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                <span
                    className="material-symbols-outlined text-primary text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    verified
                </span>
                </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold leading-tight text-primary">{fullName}</h1>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-slate-500 font-medium text-lg">
                {isVerified ? `Verified ${roleLabel}` : roleLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 space-y-8 px-6 pt-8 max-w-2xl mx-auto w-full">
        
        {/* Settings Links */}
        <section className="space-y-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Profile Settings</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manage</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {sections.map((section) => (
              <button
                key={section.title}
                onClick={section.action}
                disabled={!section.action}
                className="group flex w-full items-center justify-between border-b border-slate-100 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-50 last:border-b-0 disabled:cursor-default disabled:bg-white"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 transition-colors group-hover:bg-blue-100">
                    <span className="material-symbols-outlined text-primary">{section.icon}</span>
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-900">{section.title}</div>
                    <div className="text-sm text-slate-500 line-clamp-1">{section.description}</div>
                  </div>
                </div>
                {section.accent ? (
                  <div className="flex flex-col items-end">
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                    <span className="text-[11px] uppercase tracking-wide text-green-600 font-bold pt-1">Verified</span>
                  </div>
                ) : !section.action ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Read-only
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Account Actions */}
        <section className="space-y-3 pt-4">
           {/* Sign Out */}
          <button 
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
          >
            Sign Out
          </button>
          
          {/* Delete Account Trigger */}
          <button 
            onClick={() => {
              setConfirmInput("");
              setDeleteModalOpen(true);
            }}
            className="w-full py-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-bold hover:bg-red-100 active:bg-red-200 transition-colors"
          >
            Delete Account
          </button>
        </section>
      </main>

      <Modal
        open={isPhotoModalOpen}
        title="Edit Photo"
        onClose={() => setPhotoModalOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Upload a new photo from your device. Files are stored securely.
          </p>
          {photoDraft ? (
            <div className="flex justify-center">
              <div
                className="h-28 w-28 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200"
                style={{ backgroundImage: `url('${photoDraft}')` }}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500">Upload from device</label>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                aria-label="Upload photo from device"
              >
                <span className="material-symbols-outlined text-[32px]">
                  upload
                </span>
              </button>
              <p className="text-xs font-medium text-slate-500 text-center">
                Tap to choose a photo
              </p>
              {photoFile ? (
                <span className="text-sm text-slate-500 text-center break-all">
                  {photoFile.name}
                </span>
              ) : null}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePhoto}
              disabled={isPhotoSaving}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70"
            >
              {isPhotoSaving ? "Saving..." : "Save Photo"}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- Delete Confirmation Modal --- */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600">warning</span>
            <p className="text-sm text-red-800 leading-relaxed">
              This action is permanent and cannot be undone. All your listings, matches, and messages will be permanently removed.
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">
              Type <span className="font-mono text-red-600">delete</span> to confirm
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="delete"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>


          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={confirmInput !== "delete" || isDeleting}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
