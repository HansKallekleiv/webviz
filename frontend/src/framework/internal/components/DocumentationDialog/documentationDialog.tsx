import { Dialog } from "@lib/components/Dialog";
import type { Workbench } from "@framework/Workbench";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { OpenInNew } from "@mui/icons-material";
import { Tooltip } from "@lib/components/Tooltip";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useDocumentationFrame } from "../DocumentationFrame/useDocumentationFrame";

const DOCS_BASE_URL = "docs/";

export type DocumentationDialogProps = {
    workbench: Workbench;
};

export function DocumentationDialog(props: DocumentationDialogProps) {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [documentationUrl, setDocumentationUrl] = useGuiState(guiMessageBroker, GuiState.DocumentationUrl);

    const isOpen = documentationUrl !== null;

    function handleClose() {
        setDocumentationUrl(null);
    }

    const { documentationFrame, status, title, url } = useDocumentationFrame(documentationUrl);

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            title={
                <div className="flex gap-4 items-center">
                    {title}
                    <Tooltip title="Open full documentation in new tab">
                        <a
                            href={url ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            <OpenInNew fontSize="inherit" />
                        </a>
                    </Tooltip>
                </div>
            }
            showCloseCross
            modal
            minWidth={600}
            height={600}
        >
            <div className="relative w-full h-full">
                {status === "loading" && (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2">
                        <CircularProgress size="medium" />
                        Loading documentation
                    </div>
                )}
                {documentationFrame}
            </div>
        </Dialog>
    );
}
