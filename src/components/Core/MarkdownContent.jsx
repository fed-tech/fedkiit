"use client";

import React from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import styles from "./styles/MarkdownContent.module.scss";

function LinkRenderer({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

LinkRenderer.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
};

/**
 * Renders event descriptions stored as Markdown.
 */
export default function MarkdownContent({ children, className = "" }) {
  const source = typeof children === "string" ? children : "";
  if (!source.trim()) return null;

  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <ReactMarkdown
        components={{
          a: LinkRenderer,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

MarkdownContent.propTypes = {
  children: PropTypes.string,
  className: PropTypes.string,
};
