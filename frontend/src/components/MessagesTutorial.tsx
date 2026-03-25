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
        content: isLandlord
          ? "Pick any tenant thread here. Each conversation is labeled with the associated property."
          : "Pick any landlord thread here. Each conversation is labeled with the property it is about.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="messages-composer"]',
        title: isLandlord ? "Reply and manage access" : "Message and request access",
        content: isLandlord
          ? "Reply here and approve or deny route access requests when tenants ask for exact directions."
          : "Message the landlord here, then use the route button to request access to the full address and directions.",
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
