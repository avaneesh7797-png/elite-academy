"use client";

import { useEffect, useState } from "react";
import { Phone, Trash2 } from "lucide-react";
import { BackBar } from "@/components/emergency/back-bar";
import { TrustedContact, loadContacts, saveContacts } from "@/lib/emergency/storage";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  const persist = (next: TrustedContact[]) => {
    setContacts(next);
    saveContacts(next);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) return;
    persist([
      ...contacts,
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
        name: trimmedName,
        phone: trimmedPhone,
        relationship: relationship.trim(),
      },
    ]);
    setName("");
    setPhone("");
    setRelationship("");
  };

  const remove = (id: string) => persist(contacts.filter((c) => c.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = contacts.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= contacts.length) return;
    const next = contacts.slice();
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    persist(next);
  };

  return (
    <>
      <BackBar title="Trusted Contacts" />
      <div className="px-4 py-5">
        <p className="mb-4 text-xs text-zinc-400">
          The first contact gets called and texted your location during SOS. Reorder with the arrows.
        </p>

        <ul className="space-y-2">
          {contacts.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(c.id, -1)}
                  disabled={i === 0}
                  className="px-2 text-zinc-500 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(c.id, 1)}
                  disabled={i === contacts.length - 1}
                  className="px-2 text-zinc-500 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {i === 0 && (
                    <span className="mr-2 rounded bg-blue-600/30 px-1.5 py-0.5 text-[10px] uppercase text-blue-300">
                      Primary
                    </span>
                  )}
                  {c.name}
                </div>
                <div className="text-xs text-zinc-400">
                  {c.relationship ? `${c.relationship} · ` : ""}
                  {c.phone}
                </div>
              </div>
              <a
                href={`tel:${c.phone.replace(/\s+/g, "")}`}
                aria-label={`Call ${c.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
              <button
                onClick={() => remove(c.id)}
                aria-label={`Delete ${c.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-red-900/40 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {contacts.length === 0 && (
            <li className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-500">
              No contacts yet. Add one below.
            </li>
          )}
        </ul>

        <form onSubmit={add} className="mt-6 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Add a contact
          </h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
            required
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (with country code)"
            type="tel"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
            required
          />
          <input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Relationship (optional)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white active:bg-red-500"
          >
            Add contact
          </button>
        </form>
      </div>
    </>
  );
}
