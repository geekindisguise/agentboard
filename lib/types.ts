export const STATUSES = ["reported", "denied", "official writeup"] as const;
export type Status = (typeof STATUSES)[number];

export const STATES = ["pending", "published", "rejected"] as const;
export type State = (typeof STATES)[number];

export type Incident = {
  id: string;
  publicDate: string;
  who: string;
  summary: string;
  sourceUrl: string;
  status: Status;
  state: State;
  title: string;
  createdAt: string;
  publishedAt: string | null;
};

export type Store = {
  seeded: boolean;
  incidents: Incident[];
};
