"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Resource, ResourceType, SortMode } from "@/lib/types";

const tabs: { type: ResourceType; label: string }[] = [
  { type: "video", label: "Videos" },
  { type: "playlist", label: "Playlists" },
  { type: "channel", label: "Channels" },
];

export default function Home() {
  const [tab, setTab] = useState<ResourceType>("video");
  const [sort, setSort] = useState<SortMode>("top");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [voted, setVoted] = useState<string[]>([]);

  useEffect(() => {
    setVoted(JSON.parse(localStorage.getItem("learnTubeVotes") ?? "[]"));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/resources?type=${tab}&sort=${sort}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load resources.");
        if (active) setResources(data.resources);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [tab, sort]);

  const votedSet = useMemo(() => new Set(voted), [voted]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add that link.");
      form.reset();
      setTab(data.resource.type);
      setNotice("Added.");
      setResources((current) => (data.resource.type === tab ? [data.resource, ...current] : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that link.");
    } finally {
      setSubmitting(false);
    }
  }

  async function upvote(resource: Resource) {
    const voterId = getVoterId();
    const response = await fetch(`/api/resources/${resource.id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ voterId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not record vote.");
      return;
    }

    const nextVoted = [...new Set([...voted, resource.id])];
    localStorage.setItem("learnTubeVotes", JSON.stringify(nextVoted));
    setVoted(nextVoted);
    setResources((current) =>
      current.map((item) => (item.id === resource.id ? { ...item, upvote_count: data.upvote_count } : item)),
    );
  }

  async function removeVideo(resource: Resource) {
    if (!confirm("Remove this video?")) return;

    setError("");
    setNotice("");

    const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not remove video.");
      return;
    }

    setResources((current) => current.filter((item) => item.id !== resource.id));
    setNotice("Removed video.");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 border-b border-stone-200 pb-4">
        <h1 className="text-3xl font-semibold text-stone-950 sm:text-4xl">nosalgo</h1>
      </header>

      <section className="mb-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1 min-w-0">
            <span className="text-sm font-medium text-stone-800">YouTube link</span>
            <input
              required
              name="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              className="h-11 rounded-md border border-stone-300 px-3 outline-none focus:border-emerald-700"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={submitting}
              className="h-11 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
        {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-md border border-stone-300 bg-white p-1">
          {tabs.map((item) => (
            <button
              key={item.type}
              onClick={() => setTab(item.type)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                tab === item.type ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          Sort
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="h-10 rounded-md border border-stone-300 bg-white px-3"
          >
            <option value="top">Top</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="py-12 text-center text-stone-600">Loading...</p>
      ) : resources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white py-12 text-center text-stone-600">
          No resources yet.
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <article key={resource.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              <a href={resource.canonical_url} target="_blank" rel="noreferrer" className="block bg-stone-200">
                {resource.thumbnail_url ? (
                  <img src={resource.thumbnail_url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid aspect-video place-items-center text-sm text-stone-600">YouTube</div>
                )}
              </a>

              <div className="grid gap-3 p-4">
                <div>
                  <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-stone-950">{resource.title}</h2>
                  <p className="mt-1 text-sm text-stone-600">{resource.channel_title ?? "YouTube"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => upvote(resource)}
                    disabled={votedSet.has(resource.id)}
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {votedSet.has(resource.id) ? "Voted" : "Upvote"} · {resource.upvote_count}
                  </button>
                  {resource.type === "video" ? (
                    <button
                      onClick={() => removeVideo(resource)}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove video
                    </button>
                  ) : null}
                  <a
                    href={resource.canonical_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700"
                  >
                    Open on YouTube
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function getVoterId() {
  const stored = localStorage.getItem("learnTubeVoterId");
  if (stored) return stored;
  const next = crypto.randomUUID();
  localStorage.setItem("learnTubeVoterId", next);
  return next;
}
