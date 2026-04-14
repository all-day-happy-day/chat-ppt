export type TemplateLayoutShape = {
  layout_id: string;
};

export type GetLayoutResponse = {
  name: string;
  shapes: TemplateLayoutShape[];
};
