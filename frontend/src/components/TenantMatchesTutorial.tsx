"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

export default function TenantMatchesTutorial({ ready }: { ready: boolean }) {
  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Your matches live here",
        content: "Listings you marked Interested in Explore are collected here for quick review.",
      },
      {
        target: '[data-tour="matches-search"]',
        title: "Search and refine",
        content: "Search by location or listing type and use filters to narrow the list fast.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="matches-list"]',
        title: "Open a match",
        content:
          "Tap any match card to review the property, see the safe location label, and continue to contact or route access.",
        disableBeacon: true,
      },
      {
        target: "body",
        placement: "center",
        title: "What unlocks next",
        content:
          "After you contact the landlord, request route access in chat to unlock the full address and directions.",
        disableBeacon: true,
      },
    ],
    []
  );

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection="tenant"
      preferenceKey="hasSeenMatchesTutorial"
      steps={steps}
    />
  );
}
