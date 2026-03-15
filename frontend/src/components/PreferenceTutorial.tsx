"use client";

import { useEffect, useMemo, useState } from "react";
import Joyride, { STATUS, type CallBackProps, type Step } from "react-joyride";
import { useAppStore } from "@/store/useAppStore";
import { getTutorialFlow } from "@/lib/tutorialFlow";

type PreferenceSection = "tenant" | "landlord";

type PreferenceTutorialProps = {
  ready: boolean;
  preferenceSection: PreferenceSection;
  preferenceKey: string;
  steps: Step[];
};

const hasVisibleTarget = (selector: string) => {
  const elements = Array.from(document.querySelectorAll(selector));
  return elements.some((element) => {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  });
};

const filterRenderableSteps = (steps: Step[]) =>
  steps.filter((step) => {
    if (typeof window === "undefined") return false;
    if (typeof step.target !== "string") return true;
    if (step.target === "body") return true;
    return hasVisibleTarget(step.target);
  });

export default function PreferenceTutorial({
  ready,
  preferenceSection,
  preferenceKey,
  steps,
}: PreferenceTutorialProps) {
  const user = useAppStore((state) => state.user);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const [run, setRun] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resolvedSteps, setResolvedSteps] = useState<Step[]>([]);
  const [isEligibleFlow, setIsEligibleFlow] = useState(false);

  const sectionPreferences = useMemo(() => {
    const prefs = user?.preferences?.[preferenceSection];
    return prefs && typeof prefs === "object" ? prefs : {};
  }, [preferenceSection, user]);

  const hasSeenTutorial = Boolean(
    preferenceKey in sectionPreferences && sectionPreferences[preferenceKey]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsEligibleFlow(getTutorialFlow() === preferenceSection);
  }, [preferenceSection, user?.id, user?._id]);

  useEffect(() => {
    if (!ready || hasSeenTutorial || isSaving || !isEligibleFlow) {
      setRun(false);
      setResolvedSteps([]);
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSteps = filterRenderableSteps(steps);
      setResolvedSteps(nextSteps);
      setRun(nextSteps.length > 0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [hasSeenTutorial, isEligibleFlow, isSaving, ready, steps]);

  const markSeen = async () => {
    if (hasSeenTutorial || isSaving) return;
    setIsSaving(true);
    try {
      await updatePreferences({
        [preferenceSection]: {
          ...sectionPreferences,
          [preferenceKey]: true,
        },
      });
    } finally {
      setIsSaving(false);
      setRun(false);
    }
  };

  const handleCallback = (data: CallBackProps) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      void markSeen();
    }
  };

  if (!ready || hasSeenTutorial || !isEligibleFlow || resolvedSteps.length === 0) return null;

  return (
    <Joyride
      steps={resolvedSteps}
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
