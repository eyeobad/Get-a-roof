"use client";

import { useEffect, useMemo, useState } from "react";
import Joyride, { type CallBackProps, STATUS, type Step } from "react-joyride";
import { useAppStore } from "@/store/useAppStore";

type LandlordTutorialProps = {
  ready: boolean;
};

export default function LandlordTutorial({ ready }: LandlordTutorialProps) {
  const user = useAppStore((state) => state.user);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const [run, setRun] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasSeenTutorial = Boolean(
    user?.preferences?.landlord &&
      typeof user.preferences.landlord === "object" &&
      "hasSeenLandlordTutorial" in user.preferences.landlord &&
      user.preferences.landlord.hasSeenLandlordTutorial
  );

  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Welcome to your dashboard",
        content: "This is the quickest way to track listings, matches, and tenant activity.",
      },
      {
        target: '[data-tour="dashboard-metrics"]',
        title: "At a glance",
        content: "These cards show your current listings, matches, and unread conversations.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-listings"]',
        title: "Manage listings",
        content: "Open your properties here to publish, edit, or review performance.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-messages"]',
        title: "Messages",
        content: "Tenant conversations and follow-ups live here.",
        disableBeacon: true,
      },
    ],
    []
  );

  useEffect(() => {
    if (!ready || hasSeenTutorial || isSaving) {
      setRun(false);
      return;
    }
    const timer = window.setTimeout(() => setRun(true), 250);
    return () => window.clearTimeout(timer);
  }, [hasSeenTutorial, isSaving, ready]);

  const markSeen = async () => {
    if (hasSeenTutorial || isSaving) return;
    setIsSaving(true);
    try {
      await updatePreferences({
        landlord: {
          ...(user?.preferences?.landlord ?? {}),
          hasSeenLandlordTutorial: true,
        },
      });
    } finally {
      setIsSaving(false);
      setRun(false);
    }
  };

  const handleCallback = (data: CallBackProps) => {
    const status = data.status;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      void markSeen();
    }
  };

  if (!ready || hasSeenTutorial) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableScrolling
      callback={handleCallback}
      locale={{ back: "Back", close: "Close", last: "Done", next: "Next", skip: "Skip" }}
      styles={{
        options: {
          primaryColor: "#0a44b8",
          textColor: "#0f172a",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(15, 23, 42, 0.5)",
          arrowColor: "#ffffff",
          zIndex: 1100,
        },
        tooltip: {
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
        },
        buttonNext: {
          borderRadius: 9999,
          fontWeight: 700,
          padding: "10px 18px",
        },
        buttonBack: {
          color: "#475569",
          marginRight: 12,
        },
        buttonSkip: {
          color: "#64748b",
        },
      }}
    />
  );
}
