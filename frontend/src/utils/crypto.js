const SECRET_KEY = "sistema_final_modulo1";

function rc4(data, key) {
    let S = Array.from({length: 256}, (_, i) => i);
    let j = 0;
    let out = [];
    
    // Key-scheduling algorithm (KSA)
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key.charCodeAt(i % key.length)) % 256;
        let temp = S[i];
        S[i] = S[j];
        S[j] = temp;
    }
    
    // Pseudo-random generation algorithm (PRGA)
    let i = 0;
    j = 0;
    for (let k = 0; k < data.length; k++) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        let temp = S[i];
        S[i] = S[j];
        S[j] = temp;
        let K = S[(S[i] + S[j]) % 256];
        out.push(data[k] ^ K);
    }
    return new Uint8Array(out);
}

/**
 * Encripta un objeto o string en formato JSON y devuelve un base64 cifrado.
 */
export function encryptJSON(obj) {
    try {
        const plainText = typeof obj === "string" ? obj : JSON.stringify(obj);
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(plainText);
        const encBytes = rc4(dataBytes, SECRET_KEY);
        
        let binary = "";
        const len = encBytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(encBytes[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.error("Error al encriptar JSON:", e);
        return "";
    }
}

/**
 * Desencripta un string base64 cifrado y devuelve el objeto JSON original o texto.
 */
export function decryptJSON(cipherText) {
    try {
        if (!cipherText) return null;
        
        const binary = atob(cipherText);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        const decBytes = rc4(bytes, SECRET_KEY);
        const decoder = new TextDecoder();
        const plainText = decoder.decode(decBytes);
        try {
            return JSON.parse(plainText);
        } catch {
            return plainText; // Retornar texto plano si no era un JSON válido
        }
    } catch (e) {
        console.error("Error al desencriptar JSON:", e);
        return null;
    }
}
