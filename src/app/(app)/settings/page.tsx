"use client";

import { useState } from "react";
import { User, Github, GraduationCap, CheckCircle2, Shield, Bell } from "lucide-react";

const ALL_SKILLS = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Rust",
  "Go",
  "Tailwind CSS",
  "PostgreSQL",
  "Docker",
  "GraphQL",
];

export default function SettingsPage() {
  const [name, setName] = useState("Guest Contributor");
  const [github, setGithub] = useState("contributor-guest");
  const [college, setCollege] = useState("Stanford University");
  const [gradYear, setGradYear] = useState("2027");
  const [bio, setBio] = useState("Aspiring full-stack engineer and open source contributor.");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "TypeScript",
    "React",
    "Next.js",
    "Tailwind CSS",
  ]);
  const [isMentor, setIsMentor] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Profile</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your open-source contributor profile and discovery preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Details Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <User className="size-5 text-sky-400" />
            <h2 className="font-semibold text-base text-foreground">Contributor Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Github className="size-3.5" /> GitHub Username
              </label>
              <input
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="size-3.5" /> College / University
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Graduation Year
              </label>
              <input
                type="number"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Short Bio</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Skills & Preferences */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <Shield className="size-5 text-emerald-400" />
            <div>
              <h2 className="font-semibold text-base text-foreground">Skills & Discovery Matching</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Used to tailor your Personalized discovery feed and recommend relevant starter issues.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {ALL_SKILLS.map((skill) => {
              const active = selectedSkills.includes(skill);
              return (
                <button
                  type="button"
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                    active
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>

          {/* Mentorship Toggle */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground block">Student Mentorship</span>
              <span className="text-xs text-muted-foreground block">
                Offer to help newcomers troubleshoot repository setup in the Q&A tabs.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isMentor}
              onChange={(e) => setIsMentor(e.target.checked)}
              className="size-4 rounded accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Save button and feedback */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="size-4" />
              Settings saved successfully!
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
