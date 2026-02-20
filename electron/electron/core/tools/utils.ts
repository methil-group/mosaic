import * as path from 'path'

export function resolvePath(filePath: string, workspace: string): string {
    if (path.isAbsolute(filePath)) return filePath
    return path.join(workspace, filePath)
}

export function truncateResult(result: string, maxLen = 8000): string {
    if (result.length <= maxLen) return result
    const half = Math.floor(maxLen / 2)
    return result.slice(0, half) + `\n\n... [truncated ${result.length - maxLen} characters] ...\n\n` + result.slice(-half)
}

export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function globToRegex(glob: string): RegExp {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
    return new RegExp(`^${escaped}$`)
}
