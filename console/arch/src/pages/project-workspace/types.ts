import type { PartKindForCreate } from "../../lib/project-parts-for-patch";

export type AddPartMenuAnchor = {
  topPx: number;
  leftPx: number;
  widthPx: number;
  maxHeightPx: number;
};

export type PartKindChangeConfirmMode = "loseFilledData" | "plainValueCrossover";

export type PendingPartKindChangeConfirm = {
  mode: PartKindChangeConfirmMode;
  sortedIndex: number;
  kind: PartKindForCreate;
  resolvedLayoutId: string | null;
};

export type PartEditValueFieldRowState = {
  shapeKey: string;
  placeholderName: string;
  displayLabel: string;
  value: string;
};
