// lib/ranking.ts
import { SearchOffer, Campaign } from "./types";

export interface SponsoredResult {
  offers: SearchOffer[];
  sponsoredCampaignId: string | null;
}

/**
 * Mutates the results array to insert a sponsored result in the top slots.
 * Also marks the offer as `sponsored = true` and returns the matched campaignId.
 */
export function applySponsoredSlot(offers: SearchOffer[], activeCampaigns: Campaign[]): SponsoredResult {
  if (offers.length === 0 || activeCampaigns.length === 0) return { offers, sponsoredCampaignId: null };

  // For the prototype, we simply pick the first offer that matches a campaign's keywords.
  // In a real app, this would be an auction (highest CPC wins) and geo-targeted.
  
  for (const campaign of activeCampaigns) {
    if (campaign.remainingINR < campaign.costPerClickINR) continue;

    const keywords = campaign.productKeys as string[];
    
    // Find the first offer in the organically sorted list that matches
    const matchIdx = offers.findIndex(offer => 
      offer.inStock && // only sponsor in-stock items
      keywords.some(k => offer.productName.toLowerCase().includes(k) || offer.category.toLowerCase().includes(k))
    );

    if (matchIdx !== -1) {
      // Pull it out
      const sponsoredOffer = offers.splice(matchIdx, 1)[0];
      sponsoredOffer.sponsored = true;
      
      // Put it at the top (or slot 2 if there's an exact organic match above it)
      // For prototype, just put it at index 0.
      offers.unshift(sponsoredOffer);

      // Only one sponsored slot per search for now
      return { offers, sponsoredCampaignId: campaign.id };
    }
  }

  return { offers, sponsoredCampaignId: null };
}
