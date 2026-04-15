import type { GetLayoutResponse } from '../../types/template-layout';
import type { GetUserResponse } from '../../types/user';
import { PART_KIND_FOR_CREATE, type PartKindForCreate } from '../../lib/project-parts-for-patch';

export const INFO_DATE_FORMATTER: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const pickDefaultLayoutId = (layouts: GetLayoutResponse[]): string | null => {
  for (const layout of layouts) {
    const firstShape = layout.shapes[0];
    if (firstShape !== undefined && firstShape.layout_id.length > 0) {
      return firstShape.layout_id;
    }
  }
  return null;
};

export const resolveOwnerUsername = (users: GetUserResponse[], ownerUserId: string): string => {
  const match: GetUserResponse | undefined = users.find((user: GetUserResponse) => user.id === ownerUserId);
  if (match === undefined) {
    return ownerUserId.length > 0 ? ownerUserId : 'Unknown';
  }
  return match.username;
};

export const formatInstant = (iso: string): string => {
  const parsed: Date = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return INFO_DATE_FORMATTER.format(parsed);
};

export const shortenId = (value: string): string => {
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

export const readProjectPartType = (part: unknown): string => {
  if (typeof part !== 'object' || part === null || Array.isArray(part)) {
    return '';
  }
  const typeValue: unknown = (part as { type?: unknown }).type;
  return typeof typeValue === 'string' ? typeValue : '';
};

export const isPlainValuePartKindCrossover = (currentType: string, targetKind: PartKindForCreate): boolean => {
  return (
    (currentType === PART_KIND_FOR_CREATE.PLAIN && targetKind === PART_KIND_FOR_CREATE.VALUE) ||
    (currentType === PART_KIND_FOR_CREATE.VALUE && targetKind === PART_KIND_FOR_CREATE.PLAIN)
  );
};

export const needsDestructivePartKindConfirm = (currentType: string, targetKind: PartKindForCreate): boolean => {
  if (currentType === targetKind) {
    return false;
  }
  if (isPlainValuePartKindCrossover(currentType, targetKind)) {
    return false;
  }
  return currentType === 'LYRICS' || currentType === 'BIBLE' || currentType === 'VALUE';
};
