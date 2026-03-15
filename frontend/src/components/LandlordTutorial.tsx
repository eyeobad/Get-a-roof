"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

type LandlordTutorialProps = {
  ready: boolean;
};

export default function LandlordTutorial({ ready }: LandlordTutorialProps) {
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

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection="landlord"
      preferenceKey="hasSeenLandlordTutorial"
      steps={steps}
    />
  );
}
