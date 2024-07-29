import { createClient } from 'next-sanity';

export const client = createClient({
    projectId: 'xf91765w',
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: false,
});

export async function sanityFetch({ query, params = {}, tags }) {
    return client.fetch(query, params, {
        next: {
            revalidate: process.env.NODE_ENV === 'development' ? 30 : 3600,
            tags,
        },
    });
}
