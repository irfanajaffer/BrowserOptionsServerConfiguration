(() => {
    const initialElement = document.getElementById("preserve-test");
    if (!initialElement) {
        return;
    }

    const marker = Symbol("client-state");
    initialElement[marker] = true;
    initialElement.focus();

    const badge = document.createElement("output");
    badge.id = "preserve-test-result";
    badge.style.cssText = "position:fixed;right:1rem;bottom:1rem;z-index:1000;padding:.75rem;" +
        "border-radius:.375rem;background:#212529;color:#fff;font:14px system-ui";
    badge.textContent = "Use the test link to start enhanced navigation";
    document.body.appendChild(badge);

    Blazor.addEventListener("enhancedload", () => {
        const currentElement = document.getElementById("preserve-test");
        if (!currentElement?.textContent.includes("Enhanced navigation destination content")) {
            return;
        }

        const result = {
            sameNode: currentElement === initialElement,
            clientStatePreserved: currentElement[marker] === true,
            focusPreserved: document.activeElement === currentElement
        };

        window.preserveDomTestResult = result;
        if (!badge.isConnected) {
            document.body.appendChild(badge);
        }
        badge.textContent = result.sameNode
            ? "PRESERVED: same DOM node and client state"
            : "REPLACED: a new DOM node was created";
        badge.style.background = result.sameNode ? "#146c43" : "#b02a37";
    });
})();
