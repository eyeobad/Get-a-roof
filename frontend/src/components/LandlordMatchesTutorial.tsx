"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

export default function LandlordMatchesTutorial({ ready }: { ready: boolean }) {
  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Review property matches",
        content: "This page groups incoming tenant interest by property so you can triage quickly.",
      },
      {
        target: '[data-tour="landlord-matches-filters"]',
        title: "Prioritize the queue",
        content: "Use these controls to focus on new activity first or sort by total demand.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="landlord-matches-list"]',
        title: "Open a property queue",
        content: "Select any property card to review its tenant matches and respond.",
        disableBeacon: true,
      },
    ],
    []
  );

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection="landlord"
      preferenceKey="hasSeenLandlordMatchesTutorial"
      steps={steps}
    />
  );
}
