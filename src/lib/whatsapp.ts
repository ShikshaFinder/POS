export const WHATSAPP_NUMBER = "917984140706" // Updated with provided number

export function sendToWhatsApp(data: Record<string, string>, messagePrefix: string = "New Form Submission:") {
    const formattedMessage = Object.entries(data)
        .map(([key, value]) => `*${key}:* ${value}`)
        .join("\n")

    const fullMessage = `${messagePrefix}\n\n${formattedMessage}`
    const encodedMessage = encodeURIComponent(fullMessage)

    // Using universal link that works on mobile and web
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`

    window.open(url, "_blank")
}
