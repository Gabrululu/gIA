"use client";
import { useState } from "react";

export default function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(window.location.href); setDone(true); setTimeout(() => setDone(false), 1800); } catch { window.prompt("Copy this link", window.location.href); }
    }} className="rounded-lg border border-line px-4 py-2 text-sm hover:border-plum">
      {done ? "Link copied" : "Copy shareable link"}
    </button>
  );
}
