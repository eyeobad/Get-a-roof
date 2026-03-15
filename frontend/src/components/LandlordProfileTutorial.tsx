"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

export default function LandlordProfileTutorial({ ready }: { ready: boolean }) {
  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Manage your landlord profile",
        content: "This page controls your account details, verification entry points, and sign-out actions.",
      },
      {
        target: '[data-tour="landlord-profile-header"]',
        title: "Account identity",
        content: "Your avatar, role, and verification state are shown here.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="landlord-profile-settings"]',
        title: "Settings shortcuts",
        content: "Open these rows to review personal information and identity verification.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="landlord-profile-actions"]',
        title: "Account actions",
        content: "Sign out or manage account removal from this section.",
        disableBeacon: true,
      },
    ],
    []
  );

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection="landlord"
      preferenceKey="hasSeenLandlordProfileTutorial"
      steps={steps}
    />
  );
}
