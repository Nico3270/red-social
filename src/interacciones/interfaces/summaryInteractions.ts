export interface SummaryData {
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  reactionsByType: Record<"LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY", number>;
  userReaction: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" | null;
}