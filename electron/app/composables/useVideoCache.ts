import { ref } from 'vue'

const blobCache = ref<Record<string, string>>({})

export const useVideoCache = () => {
    
    // Preload a list of videos
    const preloadVideos = async (urls: string[]) => {
        const promises = urls.map(async (url) => {
            if (blobCache.value[url]) return

            try {
                const response = await fetch(url)
                const blob = await response.blob()
                blobCache.value[url] = URL.createObjectURL(blob)
            } catch (e) {
                console.error(`Failed to preload video: ${url}`, e)
                // Fallback: just use the original URL if fetch fails
                blobCache.value[url] = url
            }
        })

        await Promise.all(promises)
    }

    // Get the cached URL (blob) or original if not cached
    const getVideoUrl = (url?: string) => {
        if (!url) return undefined
        return blobCache.value[url] || url
    }

    return {
        preloadVideos,
        getVideoUrl
    }
}
