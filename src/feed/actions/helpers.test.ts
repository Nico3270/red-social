// src/feed/actions/helpers.test.ts
import { FeedItem } from "../feed.interfaces";
import { mockBusinessItem, mockLowPublicationItem, mockNullBusinessItem, mockParams, mockProductItem, mockPublicationItem, mockServiceItem } from "./feedMocks";
import { calculateScore, diversifyItems } from "./helpers";

describe("calculateScore", () => {
  it("aplica decay y low score para publication sin match", () => {
    const score = calculateScore(mockLowPublicationItem, mockParams);
    expect(score).toBeLessThan(5); // 0 por no hotness
  });

  it("maneja nulls sin error (edge case)", () => {
    const mockWithNull: FeedItem = { ...mockLowPublicationItem, data: { ...mockLowPublicationItem.data, negocio: undefined } };
    const score = calculateScore(mockWithNull, mockParams);
    expect(score).toBe(0);
  });

  it("score para service con matches", () => {
    const score = calculateScore(mockServiceItem, mockParams);
    expect(score).toBeGreaterThan(5); // Matches comida, followed
  });

  it("low score para business sin matches", () => {
    const score = calculateScore(mockNullBusinessItem, mockParams);
    expect(score).toBeLessThan(5);
  });

  it("score para product sin matches (branch coverage)", () => {
    const lowProduct: FeedItem = { 
      ...mockProductItem, 
      data: { 
        ...mockProductItem.data, 
        tags: [], 
        sections: [], 
        ciudad: "Bogotá", // No match Tunja
        departamento: "Otro", // No match Boyacá, para true low
        negocioId: "test-negocio-3" // No followed
      } 
    };
    const score = calculateScore(lowProduct, mockParams);
    expect(score).toBeLessThan(5); // 0 (no matches/ciudad/departamento/followed) * decay
  });

  it("score para business con full matches (functions coverage)", () => {
    const score = calculateScore(mockBusinessItem, mockParams);
    expect(score).toBeGreaterThan(5); // Matches moda/camisas/Tunja
  });

  // Nuevo: Score zero para old item (decay coverage)
  it("score zero para old item (decay coverage)", () => {
    const oldItem: FeedItem = { 
      ...mockProductItem, 
      createdAt: new Date(Date.now() - 31 * 86400000), // >30 días
      data: { ...mockProductItem.data, tags: ["moda"], sections: ["camisas"], ciudad: "Tunja", departamento: "Boyacá", negocioId: "test-negocio-1" }
    };
    const score = calculateScore(oldItem, mockParams);
    expect(score).toBe(0); // Decay anula
  });
});

describe("diversifyItems", () => {
  it("maneja single item (cobertura para loop edge i=0)", () => {
    const singleItem = [mockProductItem];
    singleItem[0].score = calculateScore(singleItem[0], mockParams);
    const diversified = diversifyItems(singleItem);
    expect(diversified.length).toBe(1);
    expect(diversified[0].id).toBe(singleItem[0].id);
  });

  it("filtra todos low scores (cobertura para empty filtered)", () => {
    const lowItems = [mockLowPublicationItem, mockNullBusinessItem];
    lowItems.forEach(item => item.score = calculateScore(item, mockParams));
    const diversified = diversifyItems(lowItems);
    expect(diversified).toHaveLength(0);
  });

  it("shuffles multi high scores (cobertura para loop i>0)", () => {
    const multiItems = [mockProductItem, mockServiceItem, mockBusinessItem];
    multiItems.forEach(item => item.score = calculateScore(item, mockParams));
    const diversified = diversifyItems(multiItems);
    expect(diversified.length).toBe(3);
    expect(diversified.map(i => i.score).sort((a, b) => b - a)).toEqual(
      multiItems.sort((a, b) => b.score - a.score).map(i => i.score)
    );
  });

  it("shuffles 4+ items (full loop coverage)", () => {
    const extraItem: FeedItem = { 
      ...mockServiceItem, 
      id: "serv-2", 
      data: { ...mockServiceItem.data, id: "serv-2", slug: "pizza-serv-2" } 
    };
    const multiItems = [mockProductItem, mockServiceItem, mockBusinessItem, extraItem];
    multiItems.forEach(item => item.score = calculateScore(item, mockParams));
    const diversified = diversifyItems(multiItems);
    expect(diversified.length).toBe(4);
    expect(diversified.map(i => i.score).sort((a, b) => b - a)).toEqual(
      multiItems.sort((a, b) => b.score - a.score).map(i => i.score)
    );
  });
});