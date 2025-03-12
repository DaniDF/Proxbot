export { DeplymentError }

class DeplymentError extends Error {
    constructor(message) {
        super(message)
        super.name = "DeplymentError"
    }
}