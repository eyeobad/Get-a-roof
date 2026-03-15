"use client";

import { useMemo } from "react";
import type { Step } from "react-joyride";
import PreferenceTutorial from "@/components/PreferenceTutorial";

type MessagesTutorialProps = {
  ready: boolean;
  isLandlord: boolean;
};

export default function MessagesTutorial({
  ready,
  isLandlord,
}: MessagesTutorialProps) {
  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: isLandlord ? "Tenant conversations" : "Your conversations",
        content: isLandlord
          ? "This is where tenant messages and follow-ups arrive."
          : "This is where your conversations with landlords stay organized.",
      },
      {
        target: '[data-tour="messages-list"]',
        title: "Conversation list",
        content: "Pick any thread here to open the current conversation.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="messages-composer"]',
        title: "Send updates",
        content: isLandlord
          ? "Reply here to keep the tenant moving through your funnel."
          : "Message the landlord here and keep the property conversation active.",
        disableBeacon: true,
      },
    ],
    [isLandlord]
  );

  return (
    <PreferenceTutorial
      ready={ready}
      preferenceSection={isLandlord ? "landlord" : "tenant"}
      preferenceKey={isLandlord ? "hasSeenLandlordMessagesTutorial" : "hasSeenMessagesTutorial"}
      steps={steps}
    />
  );
}
