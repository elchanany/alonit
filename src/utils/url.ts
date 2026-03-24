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
    return slug ? `/question/${questionId}/${slug}` : `/question/${questionId}`;
}
