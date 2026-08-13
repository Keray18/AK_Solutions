import { SkinType } from '../../shared/types/enums.js';

export interface SkinTypeSignals {
  tightness?: 'often' | 'sometimes' | 'never' | 'not_sure';
  middayShine?: 'all_over' | 't_zone' | 'none' | 'not_sure';
  flaking?: 'often' | 'sometimes' | 'never' | 'not_sure';
  tZoneDifferent?: 'yes' | 'no' | 'sometimes' | 'not_sure';
}

export const determineSkinType = (signals: SkinTypeSignals): { skinType: SkinType; reason: string } => {
  let dryScore = 0;
  let oilyScore = 0;
  let comboScore = 0;
  let normalScore = 0;

  // Tightness
  if (signals.tightness === 'often') dryScore += 2;
  if (signals.tightness === 'sometimes') { dryScore += 1; comboScore += 1; }
  if (signals.tightness === 'never') { oilyScore += 1; normalScore += 1; }

  // Midday Shine
  if (signals.middayShine === 'all_over') oilyScore += 3;
  if (signals.middayShine === 't_zone') comboScore += 3;
  if (signals.middayShine === 'none') { dryScore += 2; normalScore += 1; }

  // Flaking
  if (signals.flaking === 'often') dryScore += 3;
  if (signals.flaking === 'sometimes') dryScore += 1;
  if (signals.flaking === 'never') { oilyScore += 1; normalScore += 1; }

  // T-Zone Difference
  if (signals.tZoneDifferent === 'yes') comboScore += 3;
  if (signals.tZoneDifferent === 'no') { normalScore += 1; dryScore += 1; oilyScore += 1; }

  const scores = [
    { type: SkinType.DRY, score: dryScore, reason: "You experience frequent tightness or flaking with little to no midday oil." },
    { type: SkinType.OILY, score: oilyScore, reason: "You experience noticeable shine across most of your face by midday." },
    { type: SkinType.COMBINATION, score: comboScore, reason: "Your T-zone tends to become oily while your cheeks stay relatively balanced or dry." },
    { type: SkinType.NORMAL, score: normalScore, reason: "Your skin feels relatively comfortable and balanced throughout the day." }
  ];

  scores.sort((a, b) => b.score - a.score);

  // If all scores are 0 (e.g. all 'not_sure'), default to NORMAL or COMBINATION
  if (scores[0]!.score === 0) {
    return {
      skinType: SkinType.NORMAL,
      reason: "Based on your uncertain responses, we've suggested Normal skin as a balanced starting point. You can always change this later."
    };
  }

  return { skinType: scores[0]!.type, reason: scores[0]!.reason };
};
