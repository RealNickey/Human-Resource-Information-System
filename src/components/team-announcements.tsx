"use client";

import { useState, useTransition } from "react";
import { IconSpeakerphone } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TeamAnnouncementsProps {
  departmentId: number | null | undefined;
}

export function TeamAnnouncements({ departmentId }: TeamAnnouncementsProps) {
  const [announcement, setAnnouncement] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!announcement.trim()) {
      toast.error("Please enter an announcement");
      return;
    }

    if (!departmentId) {
      toast.error("Department not found");
      return;
    }

    startTransition(async () => {
      try {
        // In a real implementation, this would save to a database
        // For now, we'll just show a success message
        toast.success("Announcement sent to team members");
        setAnnouncement("");
      } catch (error) {
        console.error("Failed to send announcement", error);
        toast.error("Failed to send announcement");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <IconSpeakerphone className="size-5" />
          Team Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="announcement">Create an announcement</Label>
            <Textarea
              id="announcement"
              placeholder="Enter your announcement for the team..."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              rows={4}
              disabled={!departmentId}
            />
          </div>
          <Button type="submit" disabled={!departmentId || isPending}>
            {isPending ? "Sending..." : "Send Announcement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
