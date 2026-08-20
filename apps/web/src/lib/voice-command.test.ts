import { describe, expect, it } from 'vitest';
import { parseVoiceCommand } from './voice-command';

describe('parseVoiceCommand', () => {
  it('extracts a leading digit quantity', () => {
    expect(parseVoiceCommand('2 phone case')).toEqual({ quantity: 2, itemText: 'phone case' });
  });

  it('defaults to quantity 1 when no quantity word is present', () => {
    expect(parseVoiceCommand('phone case')).toEqual({ quantity: 1, itemText: 'phone case' });
  });

  it('extracts an English number word', () => {
    expect(parseVoiceCommand('three iphone cases')).toEqual({ quantity: 3, itemText: 'iphone cases' });
  });

  it('extracts a Banglish number word', () => {
    expect(parseVoiceCommand('dui phone case')).toEqual({ quantity: 2, itemText: 'phone case' });
  });

  it('extracts a combined Banglish number+counter word (ekta = one)', () => {
    expect(parseVoiceCommand('ekta charger')).toEqual({ quantity: 1, itemText: 'charger' });
  });

  it('treats "dozen" as quantity 12', () => {
    expect(parseVoiceCommand('dozen chargers')).toEqual({ quantity: 12, itemText: 'chargers' });
  });

  it('lets "dozen" override a preceding number word ("one dozen" = 12, not 1)', () => {
    expect(parseVoiceCommand('one dozen chargers')).toEqual({ quantity: 12, itemText: 'chargers' });
  });

  it('strips the Bangla counting particle "ta" immediately after a quantity', () => {
    expect(parseVoiceCommand('2 ta charger')).toEqual({ quantity: 2, itemText: 'charger' });
    expect(parseVoiceCommand('tin ta charger')).toEqual({ quantity: 3, itemText: 'charger' });
  });

  it('does not strip "ta" if it is not immediately after the quantity', () => {
    expect(parseVoiceCommand('2 charger ta')).toEqual({ quantity: 2, itemText: 'charger ta' });
  });

  it('strips leading command filler words', () => {
    expect(parseVoiceCommand('add two chargers')).toEqual({ quantity: 2, itemText: 'chargers' });
    expect(parseVoiceCommand('i want two chargers')).toEqual({ quantity: 2, itemText: 'chargers' });
    expect(parseVoiceCommand('get me two chargers')).toEqual({ quantity: 2, itemText: 'chargers' });
    expect(parseVoiceCommand('search for phone case')).toEqual({ quantity: 1, itemText: 'phone case' });
  });

  it('strips trailing filler phrases', () => {
    expect(parseVoiceCommand('two chargers to cart')).toEqual({ quantity: 2, itemText: 'chargers' });
    expect(parseVoiceCommand('two chargers please')).toEqual({ quantity: 2, itemText: 'chargers' });
  });

  it('strips stacked leading fillers', () => {
    expect(parseVoiceCommand('i want to add two chargers')).toEqual({ quantity: 2, itemText: 'chargers' });
  });

  it('is case-insensitive for quantity/filler matching but preserves item text casing', () => {
    expect(parseVoiceCommand('Two iPhone Cases')).toEqual({ quantity: 2, itemText: 'iPhone Cases' });
  });

  it('handles a plain query with no numbers or fillers at all', () => {
    expect(parseVoiceCommand('wireless earbuds')).toEqual({ quantity: 1, itemText: 'wireless earbuds' });
  });

  it('trims whitespace and collapses to empty item text gracefully', () => {
    expect(parseVoiceCommand('  2  ')).toEqual({ quantity: 2, itemText: '' });
  });
});
