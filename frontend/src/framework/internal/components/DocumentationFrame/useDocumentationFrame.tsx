import React from "react";

const DOCS_BASE_URL = "/docs/";

export type UseDocumentationFrameReturn = {
    documentationFrame: JSX.Element | null;
    status: Status;
    title: string;
    url: string;
};

type Status = "loading" | "loaded" | "error";

export function useDocumentationFrame(documentationUrl: string | null): UseDocumentationFrameReturn {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [title, setTitle] = React.useState<string>("");
    const [status, setStatus] = React.useState<Status>("loading");

    React.useEffect(function onIframeLoad() {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "webviz-docs-loaded") {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = null;
                setTitle(event.data.title);
                setStatus("loaded");
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    React.useEffect(
        function resetLoadStateOnUrlChange() {
            const currentTimeout = timeoutRef.current;
            if (currentTimeout) {
                clearTimeout(currentTimeout);
                timeoutRef.current = null;
            }
            setStatus("loading");

            timeoutRef.current = setTimeout(() => {
                setStatus("error");
            }, 10000);
        },
        [documentationUrl],
    );

    const url = DOCS_BASE_URL + (documentationUrl ?? "");
    const urlWithParams = url + "?embed&theme=light";

    const documentationFrame = documentationUrl ? (
        <iframe
            ref={iframeRef}
            src={urlWithParams}
            style={{
                width: "100%",
                height: "100%",
                border: "none",
                visibility: status === "loaded" ? "visible" : "hidden",
            }}
        ></iframe>
    ) : null;

    return {
        documentationFrame,
        status,
        title,
        url,
    };
}
