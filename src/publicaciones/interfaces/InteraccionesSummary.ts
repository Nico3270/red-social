interface InteraccionesSummary {
  numLikes: number;
  numComentarios: number;
  numCompartidos: number;
  reactionsByType: {
    LIKE: number;
    LOVE: number;
    WOW: number;
    SAD: number;
    ANGRY: number;
  };
  userReaction: "LIKE" | "LOVE" | "WOW" | "SAD" | "ANGRY" | null;  // Nuevo: Reacción del usuario específico (null si no reaccionó o no userId)
}