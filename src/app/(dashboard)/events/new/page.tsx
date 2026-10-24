"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Building, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [organizerName, setOrganizerName] = React.useState("");
  const [eventDate, setEventDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organizerName,
          eventDate,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      router.push(`/events/${data.event.id}/upload`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events/demo", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.eventId) {
        router.push(`/events/${data.eventId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Demo Event Quick Shortcut */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Looking for instant testing?</span>
            </div>
            <p className="text-xs text-indigo-700/80 mt-0.5">
              Spin up a demo event with pre-filled attendees, template, and generated certificates in 1 click.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoadDemo}
            isLoading={loading}
            className="bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50 text-xs shrink-0"
          >
            Load Demo Event
          </Button>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Step 1 of Setup</span>
            </div>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>
              Define your event details. These will automatically populate certificate placeholders like &#123;&#123;event_name&#125;&#125; and &#123;&#123;organizer&#125;&#125;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="danger" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Event Name *"
                placeholder="e.g. AI & Full-Stack Coding Hackathon 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Organizer / Club / Institution Name *"
                placeholder="e.g. ACM Student Chapter or IEEE Club"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                required
              />

              <Input
                label="Event Date *"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-700 tracking-wide">
                  Description / Notes (Optional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Optional details for certificates or email body..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Link href="/dashboard">
                  <Button variant="ghost" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" isLoading={loading}>
                  Continue to Upload Participants →
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
