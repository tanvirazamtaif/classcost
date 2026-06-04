const { prisma } = require('../db.cjs');
const { presetPermissions } = require('../lib/circlePresets.cjs');

/**
 * Trusted Circles (Phase 6) — named recipients with per-section share
 * permissions, generalizing the flat LinkedAccount. Each circle seeds its
 * permissions from a preset; the private floor (food/transit/other) stays hidden.
 */

async function createCircle(ownerUserId, { label, relation, phoneE164, preset = 'fee_buddy' }) {
  const perms = presetPermissions(preset);
  return prisma.$transaction(async (tx) => {
    const circle = await tx.trustedCircle.create({
      data: {
        ownerUserId,
        label,
        relation: relation || null,
        phoneE164: phoneE164 || null,
        preset,
        status: 'active',
      },
    });
    await tx.sharePermission.createMany({
      data: perms.map((p) => ({ circleId: circle.id, section: p.section, visibility: p.visibility, notify: p.notify })),
    });
    return tx.trustedCircle.findUnique({ where: { id: circle.id }, include: { permissions: true } });
  });
}

async function listCircles(ownerUserId) {
  return prisma.trustedCircle.findMany({
    where: { ownerUserId },
    include: { permissions: true },
    orderBy: { createdAt: 'desc' },
  });
}

// Pause / revoke / reactivate a circle (status drives access at read time).
async function setStatus(circleId, status) {
  if (!['active', 'paused', 'revoked'].includes(status)) throw new Error('Invalid status');
  return prisma.trustedCircle.update({ where: { id: circleId }, data: { status } });
}

// Toggle one section's visibility (idempotent upsert on the compound unique).
async function setPermission(circleId, section, visibility) {
  if (!['visible', 'hidden'].includes(visibility)) throw new Error('Invalid visibility');
  return prisma.sharePermission.upsert({
    where: { circleId_section: { circleId, section } },
    update: { visibility },
    create: { circleId, section, visibility },
  });
}

module.exports = { createCircle, listCircles, setStatus, setPermission };
