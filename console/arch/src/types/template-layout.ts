export type TemplateLayoutShape = {
  layout_id: string;
};

/** Slide dimensions in template coordinate units (EMU), same as shape positions from the server. */
export type TemplateSlideSizeEmu = {
  width: number;
  height: number;
};

/** Same JSON shape as shape `fill_color` / Pydantic `ColorConfig`. */
export type LayoutColorConfigJson = {
  color_type: "solid" | "none";
  color: string | null;
  alpha: number | null;
};

export type GetLayoutResponse = {
  name: string;
  shapes: TemplateLayoutShape[];
  slide_size: TemplateSlideSizeEmu;
  background_color: LayoutColorConfigJson;
};
