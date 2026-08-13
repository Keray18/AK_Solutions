import { describe, it, expect } from 'vitest';
import { determineSkinType } from './skinTypeSuggestion.engine.js';
import { SkinType } from '../../shared/types/enums.js';

describe('skinTypeSuggestion.engine', () => {
  it('should return DRY for high tightness and flaking', () => {
    const result = determineSkinType({
      tightness: 'often',
      flaking: 'often',
      middayShine: 'none',
      tZoneDifferent: 'no'
    });
    expect(result.skinType).toBe(SkinType.DRY);
  });

  it('should return OILY for high all-over shine', () => {
    const result = determineSkinType({
      tightness: 'never',
      flaking: 'never',
      middayShine: 'all_over',
      tZoneDifferent: 'no'
    });
    expect(result.skinType).toBe(SkinType.OILY);
  });

  it('should return COMBINATION for t-zone shine and difference', () => {
    const result = determineSkinType({
      tightness: 'sometimes',
      middayShine: 't_zone',
      tZoneDifferent: 'yes',
      flaking: 'never'
    });
    expect(result.skinType).toBe(SkinType.COMBINATION);
  });

  it('should return NORMAL for no extreme signals', () => {
    const result = determineSkinType({
      tightness: 'never',
      middayShine: 'none',
      flaking: 'never',
      tZoneDifferent: 'no'
    });
    expect(result.skinType).toBe(SkinType.NORMAL);
  });

  it('should default to NORMAL when uncertain', () => {
    const result = determineSkinType({
      tightness: 'not_sure',
      middayShine: 'not_sure',
      flaking: 'not_sure',
      tZoneDifferent: 'not_sure'
    });
    expect(result.skinType).toBe(SkinType.NORMAL);
  });
});
