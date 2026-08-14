/**
 * Preprocesses markdown text before rendering with ReactMarkdown/remark-math/rehype-katex.
 * Sanitizes and repairs malformed LaTeX syntax:
 *   - Multi-line \boxed{...} with optional surrounding [ ... ] on separate lines
 *   - Stray inner '$' signs inside \boxed{...}
 *   - Unescaped display brackets [ \boxed{...} ]
 *   - Parenthesized math (k > 0) ONLY outside existing math blocks
 *   - Copy artifacts like ',;'
 *   - Merged control sequences like \log\log
 *   - Improper block math formatting
 */
export const preprocessMarkdown = (text) => {
    if (!text) return '';

    let processed = text;

    // 1. Fix copy-paste artifacts like ',;' -> ', \;'
    processed = processed.replace(/,;/g, ', \\;');

    // 2. FIRST: Clean up all \boxed{...} blocks (handles multi-line, [ on separate line, stray $)
    //    This must run BEFORE any other $ manipulations
    processed = _cleanBoxedBlocks(processed);

    // 3. Convert double-escaped or single-escaped block bracket delimiters: \\[ ... \\] or \[ ... \]
    processed = processed
        .replace(/\\\\\[/g, '\n$$\n')
        .replace(/\\\\\]/g, '\n$$\n')
        .replace(/\\\[/g, '\n$$\n')
        .replace(/\\\]/g, '\n$$\n');

    // 4. Convert inline bracket math: \( ... \) or \\( ... \\)
    processed = processed
        .replace(/\\\\\(*/g, '$')
        .replace(/\\\\\)* /g, '$')
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$');

    // 5. Convert parenthesized math expressions into inline math — ONLY outside $$ and $ blocks
    //    e.g. (k > 0), (c > 1), (n^{\log n}), (\log n, \; (\log n)^2)
    //    Running inside a $$ block would double-wrap math and break KaTeX.
    processed = _applyOutsideMathBlocks(processed, (segment) =>
        segment.replace(
            /(^|[^$\\])\(([^\n)]*(?:\\log|\\ln|\\lg|\\frac|\\sqrt|\\sum|\\int|\\lim|\\alpha|\\beta|\\theta|\\pi|\\epsilon|\\cdots|\^[0-9a-zA-Z{}]+|[a-zA-Z]!|\\;|[><=])[^\n)]*)\)/g,
            (match, prefix, content) => `${prefix}$(${content.trim()})$`
        )
    );

    // 6. Fix merged LaTeX commands (e.g. \log\log -> \log \log)
    processed = processed
        .replace(/\\log\\log/g, '\\log \\log')
        .replace(/\\ln\\ln/g, '\\ln \\ln')
        .replace(/\\lg\\lg/g, '\\lg \\lg')
        .replace(/\\lim\\inf/g, '\\lim \\inf')
        .replace(/\\lim\\sup/g, '\\lim \\sup')
        .replace(/\\min\\max/g, '\\min \\max');

    // 7. Normalize $$ formatting for remark-math / rehype-katex
    processed = processed
        .replace(/\$\$\s*\$\$/g, '$$\n$$')
        .replace(/\$\$\$\$/g, '$$\n$$')
        .replace(/\$ \$/g, '$$')
        .replace(/([^\n])\$\$/g, '$1\n$$')
        .replace(/\$\$([^\n])/g, '$$\n$1');

    // 8. Fix common TeX typos / quirks
    processed = processed
        .replace(/\\bottom([a-zA-Z])/g, '\\bot $1')
        .replace(/\\bottom/g, '\\bot');

    return processed;
};

/**
 * Applies a transformation function ONLY to text segments that are outside
 * $$ ... $$ and $ ... $ math blocks. Math blocks are passed through unchanged.
 */
function _applyOutsideMathBlocks(text, fn) {
    const result = [];
    let i = 0;

    while (i < text.length) {
        // Check for $$ block
        if (text[i] === '$' && text[i + 1] === '$') {
            const end = text.indexOf('$$', i + 2);
            if (end !== -1) {
                result.push(text.slice(i, end + 2)); // math block, untouched
                i = end + 2;
                continue;
            }
        }
        // Check for $ inline block (no newlines inside)
        if (text[i] === '$') {
            const end = text.indexOf('$', i + 1);
            if (end !== -1 && !text.slice(i + 1, end).includes('\n')) {
                result.push(text.slice(i, end + 1)); // inline math, untouched
                i = end + 1;
                continue;
            }
        }
        // Find next '$'
        const nextDollar = text.indexOf('$', i);
        if (nextDollar === -1) {
            result.push(fn(text.slice(i)));
            i = text.length;
        } else {
            result.push(fn(text.slice(i, nextDollar)));
            i = nextDollar;
        }
    }

    return result.join('');
}

/**
 * Finds ALL \boxed{...} patterns in the text using brace-counting to correctly
 * identify the matching closing brace (handles nested braces like \text{...}).
 * Also handles:
 *   - Optional leading '[' possibly on its own line before \boxed
 *   - Optional trailing ']' possibly on its own line after the closing brace
 *   - Stray inner '$' signs that break KaTeX math mode
 *   - Multi-line body content collapsed to single line
 */
function _cleanBoxedBlocks(text) {
    let result = '';
    let i = 0;

    while (i < text.length) {
        const boxedKeyword = '\\boxed{';
        const boxedIdx = text.indexOf(boxedKeyword, i);

        if (boxedIdx === -1) {
            result += text.slice(i);
            break;
        }

        // Scan backwards through whitespace/newlines to check for optional leading '['
        let prefixStart = boxedIdx;
        let scanBack = boxedIdx - 1;
        while (scanBack >= i && (text[scanBack] === ' ' || text[scanBack] === '\t' || text[scanBack] === '\n' || text[scanBack] === '\r')) {
            scanBack--;
        }
        if (scanBack >= i && text[scanBack] === '[') {
            prefixStart = scanBack;
        }

        // Copy text before this \boxed block
        result += text.slice(i, prefixStart);

        // Find the matching closing '}' using brace counting
        let braceDepth = 0;
        let bodyStart = boxedIdx + boxedKeyword.length;
        let bodyEnd = -1;
        for (let j = bodyStart; j < text.length; j++) {
            if (text[j] === '{') {
                braceDepth++;
            } else if (text[j] === '}') {
                if (braceDepth === 0) {
                    bodyEnd = j;
                    break;
                }
                braceDepth--;
            }
        }

        if (bodyEnd === -1) {
            // Unmatched brace — copy as-is and stop
            result += text.slice(prefixStart);
            i = text.length;
            break;
        }

        // Extract body, strip stray '$', collapse whitespace
        let body = text.slice(bodyStart, bodyEnd);
        body = body.replace(/\$/g, '');
        body = body.replace(/\s+/g, ' ').trim();

        // Advance past '}'
        let afterBrace = bodyEnd + 1;

        // Skip optional trailing ']' possibly on its own line
        let scanFwd = afterBrace;
        while (scanFwd < text.length && (text[scanFwd] === ' ' || text[scanFwd] === '\t' || text[scanFwd] === '\n' || text[scanFwd] === '\r')) {
            scanFwd++;
        }
        if (scanFwd < text.length && text[scanFwd] === ']') {
            afterBrace = scanFwd + 1;
        }

        // Skip any trailing stray '$' signs
        while (afterBrace < text.length && (text[afterBrace] === '$' || text[afterBrace] === ' ' || text[afterBrace] === '\t')) {
            afterBrace++;
        }

        result += `\n$$\n\\boxed{ ${body} }\n$$\n`;
        i = afterBrace;
    }

    return result;
}
