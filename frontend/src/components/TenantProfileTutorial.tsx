"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

export default function TenantProfileTutorial({ ready }: { ready: boolean }) {
  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Manage your profile",
        content: "Keep your renter profile current so your matches stay relevant.",
      },
      {
        target: '[data-tour="tenant-profile-photo"]',
        title: "Profile photo",
        content: "Update your photo here so landlords recognize you when conversations start.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="tenant-profile-details"]',
        title: "Preferences and affordability",
        content: "Your commute radius, preferred state, and income all live in this section.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="tenant-profile-save"]',
        title: "Save changes",
        content: "Use this action whenever you update your renter details.",
        disableBeacon: true,
      },
    ],
    []
  );

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection="tenant"
      preferenceKey="hasSeenProfileTutorial"
      steps={steps}
    />
  );
}
