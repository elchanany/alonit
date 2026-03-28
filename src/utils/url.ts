export function generateSlug(text: string): string {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        // Replace spaces with -
        .replace(/\s+/g, '-')
        // Remove all non-word chars except hebrew and hyphens
        .replace(/[^\w\-\u0590-\u05FF]+/g, '')
        // Replace multiple - with single -
        .replace(/\-\-+/g, '-')
        // Trim - from start of text
        .replace(/^-+/, '')
        // Trim - from end of text
        .replace(/-+$/, '');
}

export function getQuestionUrl(questionId: string, title?: string): string {
    if (!title) return `/question/${questionId}`;
    const slug = generateSlug(title);
    // iOS Safari history.replaceState throws a DOMException if history path contains raw non-ASCII (Hebrew) characters.
    // It must be explicitly URL-encoded.
    return slug ? `/question/${questionId}/${encodeURIComponent(slug)}` : `/question/${questionId}`;
}
