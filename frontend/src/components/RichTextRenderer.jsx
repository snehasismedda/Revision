import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const TextWithMath = ({ text }) => {
    if (!text) return null;

    // Pattern to match math delimiters: \( ... \), \[, \], $, $$
    // Group 1: block math $$ ... $$ or \[ ... \]
    // Group 2: inline math $ ... $ or \( ... \)
    const mathRegex = /(\$\$(.*?)\$\$|\\\[(.*?)\\\])|(\$(.*?)\$|\\\((.*?)\\\))/g;

    // Split the text based on the regex
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mathRegex.exec(text)) !== null) {
        // Push any text before the match
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }

        if (match[1]) {
            // Block math (match[2] is $$...$$, match[3] is \[...\])
            const mathContent = match[2] !== undefined ? match[2] : match[3];
            parts.push({ type: 'blockMath', content: mathContent });
        } else if (match[4]) {
            // Inline math (match[5] is $...$, match[6] is \(...\))
            const mathContent = match[5] !== undefined ? match[5] : match[6];
            parts.push({ type: 'inlineMath', content: mathContent });
        }

        lastIndex = mathRegex.lastIndex;
    }

    // Push the remaining text
    if (lastIndex < text.length) {
        parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    // If no math tokens found, just return the text
    if (parts.length === 0) {
        return <span className="whitespace-pre-wrap">{text}</span>;
    }

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.type === 'inlineMath') {
                    return <InlineMath key={index} math={part.content} />;
                }
                if (part.type === 'blockMath') {
                    return <BlockMath key={index} math={part.content} />;
                }
                return <span key={index}>{part.content}</span>;
            })}
        </span>
    );
};

const RichTextRenderer = ({ content }) => {
    if (!content || !content.root) return null;

    const renderNode = (node, index) => {
        switch (node.type) {
            case 'paragraph':
                return (
                    <p key={index} className="mb-2 leading-relaxed">
                        {node.children?.map((child, i) => renderNode(child, i))}
                    </p>
                );
            case 'text':
                // Instead of just a span, split text by math delimiters and render Katex
                return <TextWithMath key={index} text={node.text} />;
            case 'list':
                const ListTag = node.listType === 'number' ? 'ol' : 'ul';
                return (
                    <ListTag key={index} className={`mb-3 ml-5 ${node.listType === 'number' ? 'list-decimal' : 'list-disc'}`} style={{ listStylePosition: 'outside' }}>
                        {node.children?.map((child, i) => renderNode(child, i))}
                    </ListTag>
                );
            case 'listItem':
                return (
                    <li key={index} className="mb-1.5 pl-1 text-slate-300">
                        {node.children?.map((child, i) => renderNode(child, i))}
                    </li>
                );
            default:
                return null;
        }
    };

    return (
        <div className="rich-text-content">
            {content.root.children?.map((node, i) => renderNode(node, i))}
        </div>
    );
};

export default RichTextRenderer;
