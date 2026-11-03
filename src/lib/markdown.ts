import { marked } from 'marked';

/** Renders release-notes Markdown to HTML. Works both at build time and in the browser. */
export function renderMarkdown(markdown: string): string {
  return markdown ? (marked.parse(markdown, { async: false }) as string) : '';
}
