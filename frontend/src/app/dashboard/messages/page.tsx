"use client";

import { Suspense } from "react";
import MessagesPage from "@/app/messages/page";

export default function DashboardMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPage />
    </Suspense>
  );
}
