"use client";

import { FormEvent, useEffect, useState } from "react";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  published: boolean;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);

  async function load() {
    const res = await fetch("/api/admin/blog");
    const data = await res.json();
    setPosts(data.posts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title"),
      slug: form.get("slug") || undefined,
      excerpt: form.get("excerpt") || null,
      content: form.get("content"),
      coverImage: form.get("coverImage") || null,
      published: form.get("published") === "on",
    };
    const res = await fetch(
      editing ? `/api/admin/blog/${editing.id}` : "/api/admin/blog",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      setMessage(editing ? "Failed to update post" : "Failed to create post");
      return;
    }
    setMessage(editing ? "Post updated" : "Post created");
    setEditing(null);
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Blog</h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Publish journal posts and SEO content.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-[#121212] p-6"
      >
        <input
          name="title"
          required
          defaultValue={editing?.title}
          placeholder="Title"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="slug"
          defaultValue={editing?.slug}
          placeholder="Slug (optional)"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <input
          name="coverImage"
          placeholder="Cover image URL"
          key={editing?.id ?? "new-cover"}
          defaultValue={editing?.coverImage ?? ""}
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={editing?.excerpt ?? ""}
          placeholder="Excerpt"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <textarea
          name="content"
          rows={8}
          defaultValue={editing?.content}
          placeholder="Content"
          className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm"
        />
        <label className="flex items-center gap-3 text-sm">
          <input
            name="published"
            type="checkbox"
            defaultChecked={editing?.published}
            className="accent-[#4a8cff]"
          />
          Published
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-[#4a8cff] px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-[#0b0b0b] uppercase"
          >
            {editing ? "Update post" : "Create post"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] tracking-[0.16em] text-[#f3efe6]/70 uppercase"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {message ? <p className="text-sm text-[#4a8cff]">{message}</p> : null}
      </form>

      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
        {posts.map((post) => (
          <li
            key={post.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{post.title}</p>
              <p className="text-xs text-[#f3efe6]/40">
                /blog/{post.slug} · {post.published ? "Published" : "Draft"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(post)}
                className="text-[#4a8cff] hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                className="text-red-400 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
