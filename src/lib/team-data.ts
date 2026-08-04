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
    name: "Madhumati Dhumak",
    role: "Lead Counseling Psychologist",
    photo: "/team/madhumati-dhumak.jpg",
    qualification:
      "PGDP Counseling Psychology · MSc Clinical Psychology · BSc Clinical Psychology",
    experience: "3+ years in clinical practice",
    approaches: [
      "Integrative & Evidence-Based Therapy",
      "Trauma-Informed Care",
      "Personalized Treatment Planning",
    ],
    specialisations: ["Anxiety & Stress", "Trauma & PTSD", "Life Transitions"],
    languages: ["English", "Hindi", "Marathi"],
    fee: "₹1,800 / session · Sliding scale available",
    intro:
      "As a therapist, I believe that meaningful healing begins when people feel genuinely seen, heard, and understood. My approach is warm, collaborative, and deeply individualized because no two people experience life in the same way. Rather than following a one-size-fits-all model, I integrate evidence-based therapeutic approaches to create a space that adapts to each client's unique needs, pace, and goals. I specialise in adults, adolescents, anxiety, depression, relationship challenges, trauma, emotional regulation, life transition, self-esteem, grief, burnout, attachment concerns, and interpersonal difficulties. I also have experience working with neurodivergent individuals and tailor therapy to ensure it remains accessible, practical, and empowering. My work combines insight with action, helping clients not only understand the patterns that keep them stuck but also develop healthier ways of relating to themselves and the people around them. Above all, I strive to create a therapeutic relationship built on trust, authenticity, and compassion - where clients can safely explore, heal, and grow.",
  },
];

export function getTeamMemberBySlug(slug: string) {
  return TEAM.find((t) => t.slug === slug);
}
