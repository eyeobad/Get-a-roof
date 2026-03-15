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
        content: "Tap any match card to open the full property details and take the next action.",
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
