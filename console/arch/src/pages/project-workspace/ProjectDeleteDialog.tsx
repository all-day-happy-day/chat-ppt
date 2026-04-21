import { ConfirmationCodeDeleteDialog } from "../../components/ConfirmationCodeDeleteDialog";

import type { ChangeEvent, ReactElement, RefObject } from "react";

const PROJECT_DELETE_BODY_INTRO: string =
  "This permanently deletes the project and all of its parts. You cannot undo this action.";

export type ProjectDeleteDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  projectName: string;
  confirmCode: string;
  typedConfirmCode: string;
  onTypedConfirmChange: (event: ChangeEvent<HTMLInputElement>) => void;
  confirmInputId: string;
  deleteError: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ProjectDeleteDialog = ({ projectName, ...rest }: ProjectDeleteDialogProps): ReactElement => {
  return (
    <ConfirmationCodeDeleteDialog
      title="Delete project?"
      entityName={projectName}
      description={PROJECT_DELETE_BODY_INTRO}
      confirmButtonLabel="Delete project"
      confirmInputName="project-delete-confirm-code"
      {...rest}
    />
  );
};
