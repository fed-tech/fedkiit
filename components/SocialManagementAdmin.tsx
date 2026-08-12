"use client";

import { useEffect, useState } from "react";
import type { SocialPost, Platform } from "@/lib/types/SocialPost";

const API = "/api/social-posts";

/**
 * No credential is handled here. The session cookie is httpOnly, so the browser
 * attaches it to these requests on its own and this component never sees it.
 *
 * This replaced a password prompt whose value was kept in sessionStorage and a
 * readable cookie — anything that could run script on the page could read the
 * admin password and keep it for a day.
 */
const JSON_HEADERS = { "Content-Type": "application/json" };

export default function SocialManagementAdminPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [platform, setPlatform] = useState<Platform>("instagram");
  const [postUrl, setPostUrl] = useState("");
  const [caption, setCaption] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editCaption, setEditCaption] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const res = await fetch(API);
    if (res.status === 401 || res.status === 403) {
      setError("You do not have permission to manage social posts.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      setPosts(data.data);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(API, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ platform, url: postUrl, caption }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.message || "Failed to add post");
      return;
    }
    setPostUrl("");
    setCaption("");
    fetchPosts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    fetchPosts();
  }

  async function handleVisibilityToggle(id: string, current: boolean) {
    await fetch(`${API}/${id}/visibility`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ isVisible: !current }),
    });
    fetchPosts();
  }

  async function handleEditSave(id: string, currentPlatform: Platform) {
    await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        platform: currentPlatform,
        url: editUrl,
        caption: editCaption,
      }),
    });
    setEditId(null);
    fetchPosts();
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 pt-[120px] text-white">
      <h1 className="text-2xl font-semibold mb-8">Social Posts Management</h1>

      <form
        onSubmit={handleAdd}
        className="bg-zinc-900 rounded-xl p-6 mb-8 flex flex-col gap-4 border border-zinc-800"
      >
        <h2 className="font-medium">Add new post</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex gap-3 flex-wrap">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <input
            type="url"
            placeholder="Post URL"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            required
            className="border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px] text-white"
          />
          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px] text-white"
          />
          <button
            type="submit"
            className="bg-white text-black rounded-lg px-5 py-2 text-sm font-medium"
          >
            Add
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm border-collapse text-left">
            <thead>
              <tr className="text-gray-400">
                <th className="border border-zinc-800 px-3 py-3 text-left">Platform</th>
                <th className="border border-zinc-800 px-3 py-3 text-left w-[220px]">URL</th>
                <th className="border border-zinc-800 px-3 py-3 text-left">Caption</th>
                <th className="border border-zinc-800 px-3 py-3 text-left w-[90px]">Visible</th>
                <th className="border border-zinc-800 px-3 py-3 text-left w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) =>
                editId === post.id ? (
                  <tr key={post.id}>
                    <td className="border border-zinc-800 px-3 py-3 text-gray-400 capitalize">
                      {post.platform}
                    </td>
                    <td className="border border-zinc-800 px-3 py-3">
                      <input
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="border border-zinc-700 bg-zinc-800 rounded px-2 py-1 text-xs w-full text-white"
                      />
                    </td>
                    <td className="border border-zinc-800 px-3 py-3">
                      <input
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        className="border border-zinc-700 bg-zinc-800 rounded px-2 py-1 text-xs w-full text-white"
                      />
                    </td>
                    <td className="border border-zinc-800 px-3 py-3" />
                    <td className="border border-zinc-800 px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(post.id, post.platform)}
                          className="text-xs bg-white text-black rounded px-3 py-1 font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-xs text-gray-400 underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={post.id} className="hover:bg-zinc-900/50">
                    <td className="border border-zinc-800 px-3 py-3 capitalize font-medium">
                      {post.platform}
                    </td>
                    <td className="border border-zinc-800 px-3 py-3 break-all">
                      <a
                        href={post.url}
                        target="_blank"
                        className="text-blue-400 underline break-all"
                        rel="noreferrer"
                      >
                        {post.url}
                      </a>
                    </td>
                    <td className="border border-zinc-800 px-3 py-3 text-gray-400 break-words">
                      {post.caption || "—"}
                    </td>
                    <td className="border border-zinc-800 px-3 py-3">
                      <button
                        onClick={() => handleVisibilityToggle(post.id, post.isVisible)}
                        className={`w-10 h-5 rounded-full transition-colors ${
                          post.isVisible ? "bg-green-500" : "bg-zinc-600"
                        }`}
                        aria-label="Toggle visibility"
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${
                            post.isVisible ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="border border-zinc-800 px-3 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setEditId(post.id);
                            setEditUrl(post.url);
                            setEditCaption(post.caption ?? "");
                          }}
                          className="text-xs underline text-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="text-xs underline text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-zinc-800 px-3 py-6 text-center text-gray-500">
                    No posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
