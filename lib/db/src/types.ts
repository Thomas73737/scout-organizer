export const userStatusEnum = ["pending", "approved", "denied", "banned"] as const;
export type UserStatus = typeof userStatusEnum[number];

export const mainBadgeEnum = ["First Class Scout", "Second Class Scout"] as const;
export type MainBadge = typeof mainBadgeEnum[number];

export const proficiencyBadgeEnum = [
  "First Aid", "Cook", "Astronomer", "Marksman", "Camper",
  "Translator", "Explorer", "Naturalist", "Physical Fitness", "Signaller",
] as const;
export type ProficiencyBadge = typeof proficiencyBadgeEnum[number];

export const hobbyBadgeEnum = [
  "Team Player", "Firefighter", "Musician", "Journalist", "Swimmer",
] as const;
export type HobbyBadge = typeof hobbyBadgeEnum[number];

export const roleEnum = ["scout", "cp", "cp_of_cps", "leader", "developer"] as const;
export type UserRole = typeof roleEnum[number];

export const accessRequestStatus = ["pending", "approved", "denied"] as const;
export type AccessRequestStatus = typeof accessRequestStatus[number];

export type User = {
  id: string;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  phone: string;
  section: string;
  team?: string | null;
  profileImageUrl?: string | null;
  nationalId?: string | null;
  whatsappNumber?: string | null;
  parentsWhatsappNumber?: string | null;
  homeAddress?: string | null;
  patrol?: string | null;
  status?: UserStatus;
  mainBadge?: MainBadge | null;
  proficiencyBadges?: ProficiencyBadge[];
  hobbyBadges?: HobbyBadge[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Session = {
  sid: string;
  sess: Record<string, unknown>;
  expire: string;
};

export type ScoutProfile = {
  id: string;
  userId: string;
  role: UserRole;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  section: string;
  team?: string | null;
  isNewScout: boolean;
  whatsappNumber?: string | null;
  parentsWhatsappNumber?: string | null;
  homeAddress?: string | null;
  nationalId?: string | null;
  photoUrl?: string | null;
  parentNationalIdPhotoUrl?: string | null;
  patrol?: string | null;
  status?: AccessRequestStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AttendanceSession = {
  id: string;
  title: string;
  sessionDate: string;
  notes?: string | null;
  createdByUserId: string;
  createdAt?: string | null;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  userId: string;
  status: "present" | "absent";
  excuse?: boolean;
  hasGear?: boolean;
  createdAt?: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  authorUserId: string;
  createdAt?: string | null;
};

export type Post = {
  id: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  authorUserId: string;
  createdAt?: string | null;
};

export type Notification = {
  id: string;
  userId: string;
  type: "announcement" | "post" | "message";
  title: string;
  message: string;
  relatedId: string;
  authorName?: string | null;
  isRead: boolean;
  createdAt?: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string | null;
  createdAt?: string | null;
};

export type PointTransaction = {
  id: string;
  userId: string;
  points: number;
  reason: string;
  awardedBy: string;
  createdAt?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  place?: string;
  notes?: string;
  createdByUserId: string;
  createdAt?: string | null;
};

export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  keyP256dh: string;
  keyAuth: string;
  userAgent?: string | null;
  createdAt?: string | null;
};
