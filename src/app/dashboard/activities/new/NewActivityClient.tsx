"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityForm } from "../components/ActivityForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/types";
import { PlusCircle } from "lucide-react";

export default function NewActivityClient() {
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccessfulCreate = (newActivity: Activity) => {
    toast({
      title: "Activity Created!",
      description: `Activity \"${newActivity.title}\" has been successfully created.`,
    });
    router.push("/dashboard/activities");
  };

  const handleCancel = () => {
    router.push("/dashboard/activities");
  };

  return (
    <>
      <PageHeader
        title="Create New Activity"
        description="Define the details for a new activity at the appropriate level."
        icon={PlusCircle}
      />
      <ActivityForm onSave={handleSuccessfulCreate} onCancel={handleCancel} />
    </>
  );
}
