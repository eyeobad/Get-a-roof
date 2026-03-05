"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { getApiErrorMessage, showToast } from "@/lib/alerts";

function AgentInviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams?.get("token") ?? "";
    const orgId = searchParams?.get("orgId") ?? "";
    const orgName = searchParams?.get("orgName") ?? "an organisation";

    const authToken = useAppStore((s) => s.authToken);
    const userId = useAppStore((s) => s.userId);
    const acceptAgentInvite = useAppStore((s) => s.acceptAgentInvite);

    const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const isLoggedIn = Boolean(authToken && userId);

    const handleAccept = async () => {
        if (!token || !orgId) {
            setErrorMessage("Invalid invite link.");
            setStatus("error");
            return;
        }
        if (!isLoggedIn) {
            const returnUrl = `/agent-invite?token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(orgId)}&orgName=${encodeURIComponent(orgName)}`;
            router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
            return;
        }

        try {
            setStatus("processing");
            await acceptAgentInvite(token, orgId);
            setStatus("success");
            showToast({
                title: "You're in!",
                text: `You've joined ${orgName} as an agent.`,
                variant: "success",
            });
        } catch (err) {
            setStatus("error");
            const message = getApiErrorMessage(err);
            setErrorMessage(message);
            showToast({ title: "Invite failed", text: message, variant: "error" });
        }
    };

    useEffect(() => {
        if (isLoggedIn && token && orgId && status === "idle") {
            // Auto-accept on page load if logged in
            void handleAccept();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    return (
        <div className="relative min-h-screen bg-white text-[#1A1A1A] font-display antialiased">
            <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-8 text-center">
                <div className="rounded-full flex items-center justify-center mb-6">
                    <Image
                        src="/logo2.svg"
                        alt="Get a Roof Logo"
                        width={160}
                        height={160}
                        className="object-contain"
                    />
                </div>

                {status === "idle" && (
                    <>
                        <div className="bg-blue-50 rounded-2xl p-6 w-full mb-8">
                            <span className="material-symbols-outlined text-5xl text-[#0a44b8] mb-3 block">
                                group_add
                            </span>
                            <h1 className="text-2xl font-bold text-[#0a44b8] mb-2">
                                Agent Invitation
                            </h1>
                            <p className="text-lg text-gray-700">
                                <strong>{decodeURIComponent(orgName)}</strong> has invited you to
                                join their team as an agent on Get a Roof.
                            </p>
                        </div>

                        {!isLoggedIn ? (
                            <div className="w-full space-y-4">
                                <p className="text-gray-600">
                                    You need to log in or create an account first.
                                </p>
                                <button
                                    onClick={handleAccept}
                                    className="flex h-14 w-full items-center justify-center gap-2 rounded-[2rem] bg-[#0a44b8] text-lg font-bold text-white shadow-lg transition hover:bg-[#082485] active:scale-[0.98]"
                                >
                                    Log In to Accept
                                    <span className="material-symbols-outlined">login</span>
                                </button>
                                <p className="text-gray-500 text-sm">
                                    Don&apos;t have an account?{" "}
                                    <Link
                                        href={`/landlord-signup?isAgent=true&redirect=${encodeURIComponent(
                                            `/agent-invite?token=${encodeURIComponent(token)}&orgId=${encodeURIComponent(orgId)}&orgName=${encodeURIComponent(orgName)}`
                                        )}`}
                                        className="font-bold text-[#0a44b8] hover:underline"
                                    >
                                        Sign up
                                    </Link>
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleAccept}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-[2rem] bg-[#0a44b8] text-lg font-bold text-white shadow-lg transition hover:bg-[#082485] active:scale-[0.98]"
                            >
                                Accept Invitation
                                <span className="material-symbols-outlined">check_circle</span>
                            </button>
                        )}
                    </>
                )}

                {status === "processing" && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#0a44b8]" />
                        <p className="text-lg font-medium text-gray-600">Accepting invite...</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined text-6xl text-emerald-500">
                            check_circle
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900">Welcome aboard!</h2>
                        <p className="text-gray-600">
                            You&apos;ve joined <strong>{decodeURIComponent(orgName)}</strong> as an agent.
                            You can now list and manage properties on their behalf.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard/properties")}
                            className="mt-4 flex h-14 items-center justify-center gap-2 rounded-[2rem] bg-[#0a44b8] px-8 text-lg font-bold text-white shadow-lg transition hover:bg-[#082485] active:scale-[0.98]"
                        >
                            Go to Dashboard
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center gap-4">
                        <span className="material-symbols-outlined text-6xl text-rose-500">
                            error
                        </span>
                        <h2 className="text-2xl font-bold text-gray-900">Invite Failed</h2>
                        <p className="text-gray-600">
                            {errorMessage || "Something went wrong. Please try again or contact the organisation."}
                        </p>
                        <button
                            onClick={() => {
                                setStatus("idle");
                                setErrorMessage("");
                            }}
                            className="mt-4 flex h-14 items-center justify-center gap-2 rounded-[2rem] bg-gray-200 px-8 text-lg font-bold text-gray-700 shadow-sm transition hover:bg-gray-300 active:scale-[0.98]"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AgentInvitePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#0a44b8]" />
                </div>
            }
        >
            <AgentInviteContent />
        </Suspense>
    );
}
