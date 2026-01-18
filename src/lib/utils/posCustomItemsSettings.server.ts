import { Prisma } from '@prisma/client';

export function mergePosCustomItemsFeatures(params: {
  existingFeatures: unknown;
  patch: {
    enabled?: boolean;
    maxNameLength?: number;
    maxPrice?: number;
  };
}): Prisma.InputJsonValue {
  const existing = (params.existingFeatures || {}) as any;
  const next = {
    ...existing,
    pos: {
      ...(existing.pos || {}),
      customItems: {
        ...((existing.pos && existing.pos.customItems) || {}),
        ...params.patch,
      },
    },
  };

  // Prisma JSON inputs cannot include `undefined`.
  return JSON.parse(JSON.stringify(next)) as Prisma.InputJsonValue;
}

export function mergePosEditOrderFeatures(params: {
  existingFeatures: unknown;
  patch: {
    enabled?: boolean;
  };
}): Prisma.InputJsonValue {
  const existing = (params.existingFeatures || {}) as any;
  const next = {
    ...existing,
    pos: {
      ...(existing.pos || {}),
      editOrder: {
        ...((existing.pos && existing.pos.editOrder) || {}),
        ...params.patch,
      },
    },
  };

  // Prisma JSON inputs cannot include `undefined`.
  return JSON.parse(JSON.stringify(next)) as Prisma.InputJsonValue;
}
