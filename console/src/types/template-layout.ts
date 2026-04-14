export type TemplateLayoutShape = {
  layout_id: string;
};

/** Slide dimensions in template coordinate units (EMU), same as shape positions from the server. */
export type TemplateSlideSizeEmu = {
  width: number;
  height: number;
};

export type GetLayoutResponse = {
  name: string;
  shapes: TemplateLayoutShape[];
  slide_size: TemplateSlideSizeEmu;
};
