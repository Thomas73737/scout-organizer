import {
  Award, Cross, ChefHat, Telescope, Target, Tent, Languages,
  Compass, Leaf, Dumbbell, Bell,
  Users, Flame, Music, BookOpen, Waves,
} from "lucide-react";

export const MAIN_BADGES = ["First Class Scout", "Second Class Scout"] as const;

export const PROFICIENCY_BADGES = [
  "First Aid", "Cook", "Astronomer", "Marksman", "Camper",
  "Translator", "Explorer", "Naturalist", "Physical Fitness", "Signaller",
] as const;

export const HOBBY_BADGES = [
  "Team Player", "Firefighter", "Musician", "Journalist", "Swimmer",
] as const;

export const ALL_BADGES = [...MAIN_BADGES, ...PROFICIENCY_BADGES, ...HOBBY_BADGES];

export type BadgeCategory = "main" | "proficiency" | "hobby";

export const BADGE_META: Record<string, {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  category: BadgeCategory;
}> = {
  "First Class Scout": {
    icon: Award, color: "text-amber-600", bgColor: "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-900/20",
    borderColor: "border-amber-400", category: "main",
  },
  "Second Class Scout": {
    icon: Award, color: "text-gray-500", bgColor: "bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/30 dark:to-slate-800/20",
    borderColor: "border-gray-400", category: "main",
  },
  "First Aid": {
    icon: Cross, color: "text-blue-600", bgColor: "bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950/30 dark:to-sky-900/20",
    borderColor: "border-blue-400", category: "proficiency",
  },
  Cook: {
    icon: ChefHat, color: "text-orange-600", bgColor: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/30 dark:to-amber-900/20",
    borderColor: "border-orange-400", category: "proficiency",
  },
  Astronomer: {
    icon: Telescope, color: "text-indigo-600", bgColor: "bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/30 dark:to-purple-900/20",
    borderColor: "border-indigo-400", category: "proficiency",
  },
  Marksman: {
    icon: Target, color: "text-red-600", bgColor: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950/30 dark:to-rose-900/20",
    borderColor: "border-red-400", category: "proficiency",
  },
  Camper: {
    icon: Tent, color: "text-emerald-600", bgColor: "bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/30 dark:to-green-900/20",
    borderColor: "border-emerald-400", category: "proficiency",
  },
  Translator: {
    icon: Languages, color: "text-violet-600", bgColor: "bg-gradient-to-br from-violet-50 to-fuchsia-100 dark:from-violet-950/30 dark:to-fuchsia-900/20",
    borderColor: "border-violet-400", category: "proficiency",
  },
  Explorer: {
    icon: Compass, color: "text-teal-600", bgColor: "bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-950/30 dark:to-cyan-900/20",
    borderColor: "border-teal-400", category: "proficiency",
  },
  Naturalist: {
    icon: Leaf, color: "text-lime-600", bgColor: "bg-gradient-to-br from-lime-50 to-green-100 dark:from-lime-950/30 dark:to-green-900/20",
    borderColor: "border-lime-400", category: "proficiency",
  },
  "Physical Fitness": {
    icon: Dumbbell, color: "text-cyan-600", bgColor: "bg-gradient-to-br from-cyan-50 to-sky-100 dark:from-cyan-950/30 dark:to-sky-900/20",
    borderColor: "border-cyan-400", category: "proficiency",
  },
  Signaller: {
    icon: Bell, color: "text-yellow-600", bgColor: "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950/30 dark:to-amber-900/20",
    borderColor: "border-yellow-400", category: "proficiency",
  },
  "Team Player": {
    icon: Users, color: "text-green-600", bgColor: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20",
    borderColor: "border-green-400", category: "hobby",
  },
  Firefighter: {
    icon: Flame, color: "text-orange-600", bgColor: "bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950/30 dark:to-red-900/20",
    borderColor: "border-orange-400", category: "hobby",
  },
  Musician: {
    icon: Music, color: "text-purple-600", bgColor: "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950/30 dark:to-pink-900/20",
    borderColor: "border-purple-400", category: "hobby",
  },
  Journalist: {
    icon: BookOpen, color: "text-sky-600", bgColor: "bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950/30 dark:to-blue-900/20",
    borderColor: "border-sky-400", category: "hobby",
  },
  Swimmer: {
    icon: Waves, color: "text-blue-600", bgColor: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-900/20",
    borderColor: "border-blue-400", category: "hobby",
  },
};

export const CATEGORY_META: Record<BadgeCategory, { label: string; labelAr: string; color: string }> = {
  main: { label: "Main Badge", labelAr: "شارة رئيسية", color: "text-amber-600" },
  proficiency: { label: "Proficiency Badges", labelAr: "شارات الكفاءة", color: "text-blue-600" },
  hobby: { label: "Hobby Badges", labelAr: "شارات الهواية", color: "text-green-600" },
};
