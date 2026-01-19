import React from "react";

import { ClickAwayListener } from "@mui/base";
import { Close, Help as HelpIcon } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { createPortal } from "@lib/utils/createPortal";
import { useDocumentationFrame } from "@framework/internal/components/DocumentationFrame/useDocumentationFrame";
import { CircularProgress } from "@lib/components/CircularProgress";

export type HelpProps =
    | {
          title: string;
          content: React.ReactNode;
      }
    | { docUrl: string };

export function Help(props: HelpProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const anchorRef = React.useRef<HTMLButtonElement>(null);
    const dialogRef = React.useRef<HTMLDivElement>(null);

    const isDocUrl = isDocUrlHelp(props);

    const {
        documentationFrame,
        status,
        title: docTitle,
    } = useDocumentationFrame(isOpen && isDocUrl ? props.docUrl : null);

    let title = "";
    let content: React.ReactNode = null;
    if (isDocUrl) {
        title = docTitle;
        if (status === "loading") {
            title = "Loading...";
            content = (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                    <CircularProgress size="medium" />
                </div>
            );
        } else if (status === "error") {
            content = (
                <div className="p-4 text-sm text-red-600">Failed to load documentation. Please try again later.</div>
            );
            title = "Error";
        }
        content = (
            <>
                {content}
                {documentationFrame}
            </>
        );
    } else {
        title = props.title;
        content = <div className="p-4 text-sm text-gray-700">{props.content}</div>;
    }

    const handleOpenClick = React.useCallback(function handleOpenClick() {
        setIsOpen(true);
    }, []);

    const handleClose = React.useCallback(function handleClose() {
        setIsOpen(false);
    }, []);

    let dialogContent = null;

    if (isOpen) {
        // Position relative to anchor element
        const rect = anchorRef.current?.getBoundingClientRect();
        const style: React.CSSProperties = {
            top: rect ? rect.bottom + 4 : 100,
            left: rect ? rect.left : 100,
        };

        dialogContent = (
            <ClickAwayListener onClickAway={handleClose}>
                <div
                    ref={dialogRef}
                    style={style}
                    className="fixed bg-white border border-gray-200 rounded-sm shadow-md max-w-sm z-[999] flex flex-col gap-2 min-w-48"
                >
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        <DenseIconButton onClick={handleClose} title="Close">
                            <Close fontSize="inherit" />
                        </DenseIconButton>
                    </div>
                    {content}
                </div>
            </ClickAwayListener>
        );
    }

    return (
        <>
            <DenseIconButton title="Show help" ref={anchorRef} onClick={handleOpenClick}>
                <HelpIcon fontSize="inherit" color="info" />
            </DenseIconButton>
            {dialogContent && createPortal(dialogContent)}
        </>
    );
}

function isDocUrlHelp(help: HelpProps): help is { docUrl: string } {
    return (help as { docUrl: string }).docUrl !== undefined;
}
