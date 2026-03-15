"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

type ExploreTutorialProps = {
  ready: boolean;
};

export default function ExploreTutorial({ ready }: ExploreTutorialProps) {
  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Welcome to Explore",
        content: "This is where you browse listings that fit your preferences.",
      },
      {
        target: '[data-tour="explore-pass"]',
        title: "Pass",
        content: "Skip a listing with one tap or swipe left.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="explore-like"]',
        title: "Interested",
        content: "Tap Interested or swipe right to keep a listing in your match flow.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="explore-filters"]',
        title: "Refine results",
        content: "Update budget, distance, and listing type here whenever you want.",
        disableBeacon: true,
      },
    ],
    []
  );

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection="tenant"
      preferenceKey="hasSeenExploreTutorial"
      steps={steps}
    />
  );
}
