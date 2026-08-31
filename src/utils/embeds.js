const { EmbedBuilder } = require('discord.js');

// Фирменные цвета West RP
const COLORS = {
  main: 0xE0A63C,     // золото
  success: 0x43B581,
  danger: 0xE04F5F,
  info: 0x5865F2,
  dark: 0x2B2D31
};

const BRAND = 'West RP • Discord';

function base(color = COLORS.main) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: BRAND })
    .setTimestamp();
}

const ok   = (t, d) => base(COLORS.success).setTitle(`✅ ${t}`).setDescription(d ?? null);
const err  = (t, d) => base(COLORS.danger).setTitle(`⛔ ${t}`).setDescription(d ?? null);
const info = (t, d) => base(COLORS.info).setTitle(t).setDescription(d ?? null);

module.exports = { COLORS, BRAND, base, ok, err, info };
