export interface TeamMember {
  slug: string;
  name: string;
  role: string;
  photo: string;
  qualification: string;
  experience: string;
  approaches: string[];
  specialisations: string[];
  languages: string[];
  fee: string;
  intro: string;
}

export const TEAM: TeamMember[] = [
  {
    slug: "madhumati-dhumak",
    name: "Dr. Madhumati Dhumak",
    role: "Founding Director & Clinical Psychologist",
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
    qualification: "M.Phil Clinical Psychology · RCI Licensed",
    experience: "12+ years in clinical practice",
    approaches: [
      "Cognitive Behavioral Therapy",
      "Acceptance & Commitment Therapy",
      "Trauma-Informed Care",
    ],
    specialisations: ["Anxiety & Stress", "Trauma & PTSD", "Life Transitions"],
    languages: ["English", "Hindi", "Marathi"],
    fee: "₹1,500 / session",
    intro:
      "I believe therapy is a collaborative partnership. My approach centers on creating a warm, non-judgmental atmosphere where you can safely explore your vulnerabilities, challenge deep-seated patterns, and build genuine self-compassion, entirely at your own pace.",
  },
];

export function getTeamMemberBySlug(slug: string) {
  return TEAM.find((t) => t.slug === slug);
}
