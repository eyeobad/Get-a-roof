"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import LandlordProfileTutorial from "@/components/LandlordProfileTutorial";
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
  const [hasHydratedSession, setHasHydratedSession] = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit State
  const [isPhotoModalOpen, setPhotoModalOpen] = useState(false);
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const [photoDraft, setPhotoDraft] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [contactPhoneDraft, setContactPhoneDraft] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const [isContactSaving, setIsContactSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  useToastError(photoError);
  useToastError(contactError);
  useToastError(deleteError);

  // --- Effects ---
  useEffect(() => {
    setHasHydratedSession(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedSession) return;
    if (!authToken || !userId) {
      router.replace("/login");
    }
  }, [authToken, hasHydratedSession, userId, router]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
        if (!hasHydratedSession || !authToken || !userId) {
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
  }, [fetchUserProfile, authToken, hasHydratedSession, userId]);

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
  const photoUrl = user?.photoUrl || "/avatar-placeholder.svg";

  const hasServerPhone = Boolean(user?.phoneNumber?.trim());


  // --- Handlers ---
  const handleSignOut = () => {
    clearAuth();
    router.push("/login");
  };

  const handlePhotoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
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

  const handleSaveContact = async () => {
    setContactError(null);
    if (hasServerPhone) {
      setContactModalOpen(false);
      return;
    }
    const nextPhone = contactPhoneDraft.trim();
    if (!nextPhone) {
      setContactError("Phone number is required.");
      return;
    }
    setIsContactSaving(true);
    try {
      await updateUser({ phoneNumber: nextPhone });
      showToast({ title: "Contact details updated", variant: "success" });
      setContactModalOpen(false);
      await fetchUserProfile();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setContactError(message);
      showToast({ title: message, variant: "error" });
    } finally {
      setIsContactSaving(false);
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
      <header
        data-tour="landlord-profile-header"
        className="border-b border-slate-200 bg-slate-100 px-6 py-4"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-[40px_1fr_40px] items-center">
          <div className="justify-self-start">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70 text-primary transition-colors hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-[19px]">arrow_back</span>
            </button>
          </div>
          <div className="min-w-0 justify-self-center text-center">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              My Profile
            </h1>
            <div className="mt-2 inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
              {roleLabel}
            </div>
          </div>
          <div className="justify-self-end">
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70 text-primary transition-colors hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 space-y-8 px-6 pt-8 max-w-2xl mx-auto w-full">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
              Contact Details
            </p>
                    <button
                      onClick={() => {
                        setContactPhoneDraft(user?.phoneNumber ?? "");
                        setContactError(null);
                        setContactModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-slate-50 transition-colors"
                      aria-label="Edit contact details"
                    >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <div
              className="relative group cursor-pointer"
              onClick={() => setPhotoModalOpen(true)}
            >
              <div
                className="h-24 w-24 rounded-full bg-slate-200 bg-cover bg-center border-4 border-white shadow-md group-hover:brightness-90 transition-all"
                style={{ backgroundImage: `url('${photoUrl}')` }}
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

            <p className="mt-4 text-2xl font-bold text-primary">{fullName}</p>
            <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
            <p className="text-sm text-slate-500">{user?.phoneNumber}</p>
            <button
              onClick={() => {
                if (!isVerified) router.push("/verify-identity");
              }}
              className={[
                "mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                isVerified
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-blue-200 bg-blue-50 text-primary hover:bg-blue-100",
              ].join(" ")}
              disabled={isVerified}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isVerified ? "verified" : "verified_user"}
              </span>
              {isVerified ? "Identity Verified" : "Verify Identity"}
            </button>
          </div>
        </section>

        {/* Account Actions */}
        <section data-tour="landlord-profile-actions" className="space-y-3 pt-4">
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

      <LandlordProfileTutorial ready={Boolean(authToken && user && !isLoading)} />

      <Modal
        open={isPhotoModalOpen}
        title="Update Profile Photo"
        onClose={() => setPhotoModalOpen(false)}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isPhotoSaving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Upload photo from device"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {isPhotoSaving ? "Uploading..." : "Upload from device"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">
              JPG, PNG, WEBP recommended
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoFileChange}
            />
          </div>
          {photoFile ? (
            <span className="block text-sm text-slate-500 text-center break-all">
              {photoFile.name}
            </span>
          ) : null}
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

      <Modal
        open={isContactModalOpen}
        title="Edit Contact Details"
        onClose={() => setContactModalOpen(false)}
      >
        <div className="space-y-4">
          {[
            { label: "Full Name", icon: "person", value: fullName },
            { label: "Email", icon: "mail", value: user?.email ?? "" },
          ].map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-sm font-semibold text-slate-500">{field.label}</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  {field.icon}
                </span>
                <input
                  className="w-full bg-transparent text-base font-medium text-slate-800 outline-none"
                  value={field.value}
                  readOnly
                />
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-500">Phone Number</label>
            <div
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-3 transition",
                hasServerPhone
                  ? "border-slate-200 bg-slate-50"
                  : "border-blue-200 bg-blue-50 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-slate-400 text-[20px]">phone</span>
              <input
                className="w-full bg-transparent text-base font-medium text-slate-800 outline-none placeholder:text-slate-400"
                value={contactPhoneDraft}
                readOnly={hasServerPhone}
                placeholder={hasServerPhone ? undefined : "Add phone number"}
                onChange={(e) => setContactPhoneDraft(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => setContactModalOpen(false)}
              className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveContact}
              disabled={isContactSaving}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70"
            >
              {isContactSaving ? "Saving..." : "Save Contact"}
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
