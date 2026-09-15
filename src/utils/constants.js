// Theme classes for dark/light mode
// Dark: Obsidian Ember — true black with warm amber/gold accent
// Light: Warm stone with amber accent
export const themeClasses = {
  dark: {
    bg: 'bg-[#050607]',
    text: 'text-[#E8ECF1]',
    textMuted: 'text-[#9AA4B0]',
    textDimmed: 'text-[#7C8794]',
    card: 'bg-[#0D0F12] border border-[#1C2027] rounded-lg',
    cardAlt: 'bg-[#0D0F12] border-[#1C2027] rounded-lg',
    cardBorder: 'border-[#1C2027]',
    input: 'bg-[#0A0C0F] border-[#1C2027] rounded-md font-mono text-sm',
    button: 'bg-[#14171C] text-[#E8ECF1] border border-[#1C2027] hover:border-[#2A3039] hover:bg-[#1A1E25] rounded-md',
    buttonPrimary: 'bg-ember-500 text-[#1A1400] hover:bg-ember-400 rounded-md font-semibold',
    buttonActive: 'bg-ember-500 text-[#1A1400] rounded-md font-semibold',
    accent: 'text-ember-500',
    accentBg: 'bg-ember-500',
    gradientText: 'text-spectrum font-display font-bold',
    gradientBg: 'bg-spectrum',
    tag: 'bg-[#14171C] text-[#9AA4B0] border border-[#1C2027] rounded-md font-mono text-xs',
    tagActive: 'bg-ember-500 text-[#1A1400] rounded-md font-medium',
  },
  light: {
    bg: 'bg-[#F5F6F8]',
    text: 'text-[#0F1216]',
    textMuted: 'text-[#4B5563]',
    textDimmed: 'text-[#6B7280]',
    card: 'bg-white border border-[#D9DDE3] rounded-lg',
    cardAlt: 'bg-[#EDEFF3] border-[#D9DDE3] rounded-lg',
    cardBorder: 'border-[#D9DDE3]',
    input: 'bg-white border-[#D9DDE3] rounded-md font-mono text-sm',
    button: 'bg-white text-[#0F1216] border border-[#D9DDE3] hover:border-[#B8BEC7] hover:bg-[#F5F6F8] rounded-md',
    buttonPrimary: 'bg-ember-600 text-white hover:bg-ember-700 rounded-md font-semibold',
    buttonActive: 'bg-ember-600 text-white rounded-md font-semibold',
    accent: 'text-ember-600',
    accentBg: 'bg-ember-600',
    accentOrange: 'text-ember-700',
    gradientText: 'text-spectrum font-display font-bold',
    gradientBg: 'bg-spectrum',
    tag: 'bg-[#EDEFF3] text-[#4B5563] border border-[#D9DDE3] rounded-md font-mono text-xs',
    tagActive: 'bg-ember-600 text-white rounded-md font-medium',
  }
};
